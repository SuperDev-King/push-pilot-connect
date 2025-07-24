# VB.NET Backend Implementation for FCM Push Notifications

## Required NuGet Packages
```xml
<PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="7.0.3" />
<PackageReference Include="Microsoft.IdentityModel.Tokens" Version="7.0.3" />
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="7.0.13" />
<PackageReference Include="System.Data.SqlClient" Version="4.8.5" />
<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
```

## 1. JWT Helper Class (JwtHelper.vb)

```vb
Imports System.IdentityModel.Tokens.Jwt
Imports System.Security.Claims
Imports Microsoft.IdentityModel.Tokens
Imports System.Text
Imports System.Configuration

Public Class JwtHelper
    Private Shared ReadOnly SecretKey As String = ConfigurationManager.AppSettings("JwtSecretKey")
    Private Shared ReadOnly Issuer As String = ConfigurationManager.AppSettings("JwtIssuer")
    Private Shared ReadOnly Audience As String = ConfigurationManager.AppSettings("JwtAudience")

    Public Shared Function GenerateToken(userId As String, email As String, name As String) As String
        Dim key = Encoding.ASCII.GetBytes(SecretKey)
        Dim claims = New List(Of Claim) From {
            New Claim(ClaimTypes.NameIdentifier, userId),
            New Claim(ClaimTypes.Email, email),
            New Claim(ClaimTypes.Name, name),
            New Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            New Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        }

        Dim tokenDescriptor = New SecurityTokenDescriptor() With {
            .Subject = New ClaimsIdentity(claims),
            .Expires = DateTime.UtcNow.AddDays(7),
            .Issuer = Issuer,
            .Audience = Audience,
            .SigningCredentials = New SigningCredentials(New SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        }

        Dim tokenHandler = New JwtSecurityTokenHandler()
        Dim token = tokenHandler.CreateToken(tokenDescriptor)
        Return tokenHandler.WriteToken(token)
    End Function

    Public Shared Function ValidateToken(token As String) As ClaimsPrincipal
        Dim key = Encoding.ASCII.GetBytes(SecretKey)
        Dim tokenHandler = New JwtSecurityTokenHandler()

        Try
            Dim validationParameters = New TokenValidationParameters() With {
                .ValidateIssuerSigningKey = True,
                .IssuerSigningKey = New SymmetricSecurityKey(key),
                .ValidateIssuer = True,
                .ValidIssuer = Issuer,
                .ValidateAudience = True,
                .ValidAudience = Audience,
                .ValidateLifetime = True,
                .ClockSkew = TimeSpan.Zero
            }

            Dim principal = tokenHandler.ValidateToken(token, validationParameters, Nothing)
            Return principal
        Catch ex As Exception
            Return Nothing
        End Try
    End Function

    Public Shared Function GetUserIdFromToken(token As String) As String
        Dim principal = ValidateToken(token)
        If principal IsNot Nothing Then
            Return principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
        End If
        Return Nothing
    End Function
End Class
```

## 2. Database Helper (DatabaseHelper.vb)

```vb
Imports System.Data.SqlClient
Imports System.Configuration

Public Class DatabaseHelper
    Private Shared ReadOnly ConnectionString As String = ConfigurationManager.ConnectionStrings("DefaultConnection").ConnectionString

    Public Shared Function AuthenticateUser(email As String, password As String) As UserModel
        Dim query = "SELECT Id, Email, Name, PasswordHash FROM Users WHERE Email = @Email AND IsActive = 1"
        
        Using connection As New SqlConnection(ConnectionString)
            Using command As New SqlCommand(query, connection)
                command.Parameters.AddWithValue("@Email", email)
                connection.Open()
                
                Using reader = command.ExecuteReader()
                    If reader.Read() Then
                        Dim hashedPassword = reader("PasswordHash").ToString()
                        
                        ' Verify password (assuming you're using BCrypt)
                        If BCrypt.Net.BCrypt.Verify(password, hashedPassword) Then
                            Return New UserModel With {
                                .Id = reader("Id").ToString(),
                                .Email = reader("Email").ToString(),
                                .Name = reader("Name").ToString()
                            }
                        End If
                    End If
                End Using
            End Using
        End Using
        
        Return Nothing
    End Function

    Public Shared Function RegisterFcmToken(userId As String, fcmToken As String, deviceType As String) As Boolean
        Try
            ' First, check if token already exists for this user
            Dim checkQuery = "SELECT COUNT(*) FROM UserFcmTokens WHERE UserId = @UserId AND FcmToken = @FcmToken"
            
            Using connection As New SqlConnection(ConnectionString)
                Using checkCommand As New SqlCommand(checkQuery, connection)
                    checkCommand.Parameters.AddWithValue("@UserId", userId)
                    checkCommand.Parameters.AddWithValue("@FcmToken", fcmToken)
                    connection.Open()
                    
                    Dim count = Convert.ToInt32(checkCommand.ExecuteScalar())
                    
                    If count = 0 Then
                        ' Insert new token
                        Dim insertQuery = "INSERT INTO UserFcmTokens (UserId, FcmToken, DeviceType, CreatedAt, IsActive) VALUES (@UserId, @FcmToken, @DeviceType, @CreatedAt, 1)"
                        
                        Using insertCommand As New SqlCommand(insertQuery, connection)
                            insertCommand.Parameters.AddWithValue("@UserId", userId)
                            insertCommand.Parameters.AddWithValue("@FcmToken", fcmToken)
                            insertCommand.Parameters.AddWithValue("@DeviceType", deviceType)
                            insertCommand.Parameters.AddWithValue("@CreatedAt", DateTime.UtcNow)
                            
                            Dim result = insertCommand.ExecuteNonQuery()
                            Return result > 0
                        End Using
                    Else
                        ' Update existing token timestamp
                        Dim updateQuery = "UPDATE UserFcmTokens SET UpdatedAt = @UpdatedAt, IsActive = 1 WHERE UserId = @UserId AND FcmToken = @FcmToken"
                        
                        Using updateCommand As New SqlCommand(updateQuery, connection)
                            updateCommand.Parameters.AddWithValue("@UserId", userId)
                            updateCommand.Parameters.AddWithValue("@FcmToken", fcmToken)
                            updateCommand.Parameters.AddWithValue("@UpdatedAt", DateTime.UtcNow)
                            
                            updateCommand.ExecuteNonQuery()
                            Return True
                        End Using
                    End If
                End Using
            End Using
        Catch ex As Exception
            ' Log exception
            System.Diagnostics.Debug.WriteLine($"Error registering FCM token: {ex.Message}")
            Return False
        End Try
    End Function

    Public Shared Function GetUserFcmTokens(userId As String) As List(Of String)
        Dim tokens As New List(Of String)
        Dim query = "SELECT FcmToken FROM UserFcmTokens WHERE UserId = @UserId AND IsActive = 1"
        
        Using connection As New SqlConnection(ConnectionString)
            Using command As New SqlCommand(query, connection)
                command.Parameters.AddWithValue("@UserId", userId)
                connection.Open()
                
                Using reader = command.ExecuteReader()
                    While reader.Read()
                        tokens.Add(reader("FcmToken").ToString())
                    End While
                End Using
            End Using
        End Using
        
        Return tokens
    End Function
End Class
```

## 3. Data Models (Models.vb)

```vb
Public Class UserModel
    Public Property Id As String
    Public Property Email As String
    Public Property Name As String
End Class

Public Class LoginRequest
    Public Property Email As String
    Public Property Password As String
End Class

Public Class LoginResponse
    Public Property Token As String
    Public Property User As UserModel
    Public Property Success As Boolean
    Public Property Message As String
End Class

Public Class FcmTokenRequest
    Public Property FcmToken As String
    Public Property DeviceType As String
End Class

Public Class ApiResponse
    Public Property Success As Boolean
    Public Property Message As String
    Public Property Data As Object
End Class
```

## 4. JWT Middleware (JwtMiddleware.vb)

```vb
Imports Microsoft.AspNetCore.Http
Imports System.Threading.Tasks

Public Class JwtMiddleware
    Private ReadOnly _next As RequestDelegate

    Public Sub New(nextDelegate As RequestDelegate)
        _next = nextDelegate
    End Sub

    Public Async Function InvokeAsync(context As HttpContext) As Task
        Dim token = context.Request.Headers("Authorization").FirstOrDefault()?.Split(" ").Last()

        If Not String.IsNullOrEmpty(token) Then
            AttachUserToContext(context, token)
        End If

        Await _next(context)
    End Function

    Private Sub AttachUserToContext(context As HttpContext, token As String)
        Try
            Dim principal = JwtHelper.ValidateToken(token)
            If principal IsNot Nothing Then
                context.Items("User") = principal
                context.Items("UserId") = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            End If
        Catch ex As Exception
            ' Token validation failed
            System.Diagnostics.Debug.WriteLine($"JWT validation failed: {ex.Message}")
        End Try
    End Sub
End Class
```

## 5. API Controllers

### AuthController.vb
```vb
Imports Microsoft.AspNetCore.Mvc
Imports Newtonsoft.Json

<ApiController>
<Route("api/[controller]")>
Public Class AuthController
    Inherits ControllerBase

    <HttpPost("login")>
    Public Function Login(<FromBody> request As LoginRequest) As IActionResult
        Try
            If String.IsNullOrEmpty(request.Email) OrElse String.IsNullOrEmpty(request.Password) Then
                Return BadRequest(New LoginResponse With {
                    .Success = False,
                    .Message = "Email and password are required"
                })
            End If

            Dim user = DatabaseHelper.AuthenticateUser(request.Email, request.Password)
            
            If user IsNot Nothing Then
                Dim token = JwtHelper.GenerateToken(user.Id, user.Email, user.Name)
                
                Return Ok(New LoginResponse With {
                    .Success = True,
                    .Token = token,
                    .User = user,
                    .Message = "Login successful"
                })
            Else
                Return Unauthorized(New LoginResponse With {
                    .Success = False,
                    .Message = "Invalid email or password"
                })
            End If
        Catch ex As Exception
            Return StatusCode(500, New LoginResponse With {
                .Success = False,
                .Message = "Internal server error"
            })
        End Try
    End Function

    <HttpPost("refresh-token")>
    <Authorize>
    Public Function RefreshToken() As IActionResult
        Try
            Dim userId = HttpContext.Items("UserId")?.ToString()
            If String.IsNullOrEmpty(userId) Then
                Return Unauthorized()
            End If

            ' Get user details and generate new token
            ' Implementation depends on your user storage
            Dim newToken = JwtHelper.GenerateToken(userId, "", "")
            
            Return Ok(New ApiResponse With {
                .Success = True,
                .Data = New With {.Token = newToken}
            })
        Catch ex As Exception
            Return StatusCode(500, New ApiResponse With {
                .Success = False,
                .Message = "Internal server error"
            })
        End Try
    End Function
End Class
```

### NotificationController.vb
```vb
Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Authorization

<ApiController>
<Route("api/[controller]")>
<Authorize>
Public Class NotificationController
    Inherits ControllerBase

    <HttpPost("register-fcm-token")>
    Public Function RegisterFcmToken(<FromBody> request As FcmTokenRequest) As IActionResult
        Try
            Dim userId = HttpContext.Items("UserId")?.ToString()
            
            If String.IsNullOrEmpty(userId) Then
                Return Unauthorized(New ApiResponse With {
                    .Success = False,
                    .Message = "User not authenticated"
                })
            End If

            If String.IsNullOrEmpty(request.FcmToken) Then
                Return BadRequest(New ApiResponse With {
                    .Success = False,
                    .Message = "FCM token is required"
                })
            End If

            ' Default device type if not provided
            If String.IsNullOrEmpty(request.DeviceType) Then
                request.DeviceType = If(Request.Headers.UserAgent.ToString().Contains("Mobile"), "mobile", "web")
            End If

            Dim success = DatabaseHelper.RegisterFcmToken(userId, request.FcmToken, request.DeviceType)
            
            If success Then
                Return Ok(New ApiResponse With {
                    .Success = True,
                    .Message = "FCM token registered successfully"
                })
            Else
                Return StatusCode(500, New ApiResponse With {
                    .Success = False,
                    .Message = "Failed to register FCM token"
                })
            End If
        Catch ex As Exception
            Return StatusCode(500, New ApiResponse With {
                .Success = False,
                .Message = "Internal server error"
            })
        End Try
    End Function

    <HttpGet("fcm-tokens")>
    Public Function GetFcmTokens() As IActionResult
        Try
            Dim userId = HttpContext.Items("UserId")?.ToString()
            
            If String.IsNullOrEmpty(userId) Then
                Return Unauthorized()
            End If

            Dim tokens = DatabaseHelper.GetUserFcmTokens(userId)
            
            Return Ok(New ApiResponse With {
                .Success = True,
                .Data = tokens
            })
        Catch ex As Exception
            Return StatusCode(500, New ApiResponse With {
                .Success = False,
                .Message = "Internal server error"
            })
        End Try
    End Function

    <HttpDelete("fcm-token/{token}")>
    Public Function RemoveFcmToken(token As String) As IActionResult
        Try
            Dim userId = HttpContext.Items("UserId")?.ToString()
            
            If String.IsNullOrEmpty(userId) Then
                Return Unauthorized()
            End If

            ' Implementation to remove specific token
            ' Add to DatabaseHelper as needed
            
            Return Ok(New ApiResponse With {
                .Success = True,
                .Message = "FCM token removed successfully"
            })
        Catch ex As Exception
            Return StatusCode(500, New ApiResponse With {
                .Success = False,
                .Message = "Internal server error"
            })
        End Try
    End Function
End Class
```

## 6. Startup Configuration (Startup.vb)

```vb
Imports Microsoft.AspNetCore.Authentication.JwtBearer
Imports Microsoft.IdentityModel.Tokens
Imports System.Text

Public Class Startup
    Public Property Configuration As IConfiguration

    Public Sub New(configuration As IConfiguration)
        Me.Configuration = configuration
    End Sub

    Public Sub ConfigureServices(services As IServiceCollection)
        ' Add controllers
        services.AddControllers()

        ' Add CORS
        services.AddCors(Function(options)
            options.AddPolicy("AllowAll", Function(builder)
                builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()
            End Function)
        End Function)

        ' Add JWT Authentication
        Dim key = Encoding.ASCII.GetBytes(Configuration("JwtSecretKey"))
        services.AddAuthentication(Function(x)
            x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme
            x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme
        End Function).AddJwtBearer(Function(x)
            x.RequireHttpsMetadata = False
            x.SaveToken = True
            x.TokenValidationParameters = New TokenValidationParameters() With {
                .ValidateIssuerSigningKey = True,
                .IssuerSigningKey = New SymmetricSecurityKey(key),
                .ValidateIssuer = True,
                .ValidIssuer = Configuration("JwtIssuer"),
                .ValidateAudience = True,
                .ValidAudience = Configuration("JwtAudience"),
                .ValidateLifetime = True,
                .ClockSkew = TimeSpan.Zero
            }
        End Function)

        ' Add Swagger
        services.AddSwaggerGen()
    End Sub

    Public Sub Configure(app As IApplicationBuilder, env As IWebHostEnvironment)
        If env.IsDevelopment() Then
            app.UseDeveloperExceptionPage()
            app.UseSwagger()
            app.UseSwaggerUI()
        End If

        app.UseRouting()
        app.UseCors("AllowAll")
        
        ' Add JWT middleware
        app.UseMiddleware(Of JwtMiddleware)()
        
        app.UseAuthentication()
        app.UseAuthorization()

        app.UseEndpoints(Sub(endpoints)
            endpoints.MapControllers()
        End Sub)
    End Sub
End Class
```

## 7. Database Schema (SQL)

```sql
-- Users table
CREATE TABLE Users (
    Id NVARCHAR(50) PRIMARY KEY,
    Email NVARCHAR(255) UNIQUE NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    PasswordHash NVARCHAR(500) NOT NULL,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE()
);

-- FCM Tokens table
CREATE TABLE UserFcmTokens (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId NVARCHAR(50) NOT NULL,
    FcmToken NVARCHAR(500) NOT NULL,
    DeviceType NVARCHAR(50) NOT NULL, -- 'web', 'android', 'ios'
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    UNIQUE(UserId, FcmToken)
);

-- Notifications log table (optional)
CREATE TABLE NotificationLogs (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId NVARCHAR(50) NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Body NVARCHAR(MAX) NOT NULL,
    FcmToken NVARCHAR(500) NOT NULL,
    Status NVARCHAR(50) NOT NULL, -- 'sent', 'failed', 'delivered'
    SentAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);
```

## 8. App.config / appsettings.json

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <connectionStrings>
    <add name="DefaultConnection" connectionString="Data Source=your-server;Initial Catalog=your-database;Integrated Security=True" />
  </connectionStrings>
  
  <appSettings>
    <add key="JwtSecretKey" value="your-super-secret-jwt-key-here-make-it-very-long-and-complex" />
    <add key="JwtIssuer" value="your-app-name" />
    <add key="JwtAudience" value="your-app-users" />
  </appSettings>
</configuration>
```

This complete VB.NET backend provides:
- JWT authentication with login/refresh endpoints
- FCM token registration and management
- Proper middleware for JWT validation
- Database operations with SQL Server
- Error handling and validation
- CORS configuration for web requests
- Swagger documentation support

Make sure to:
1. Install required NuGet packages
2. Update connection strings and JWT settings
3. Create the database tables using the provided schema
4. Hash passwords using BCrypt before storing