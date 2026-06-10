using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Services;

namespace ProjectManagementSystem.Tests.Services;

public class TokenServiceTests
{
    private const string SecretKey  = "test-secret-key-that-is-at-least-32-chars!!";
    private const string Issuer     = "TestIssuer";
    private const string Audience   = "TestAudience";
    private const string ExpiryHours = "24";

    private readonly TokenService _sut;

    public TokenServiceTests()
    {
        var jwtSection = Substitute.For<IConfigurationSection>();
        jwtSection["Key"].Returns(SecretKey);
        jwtSection["Issuer"].Returns(Issuer);
        jwtSection["Audience"].Returns(Audience);
        jwtSection["ExpiryHours"].Returns(ExpiryHours);

        var config = Substitute.For<IConfiguration>();
        config.GetSection("Jwt").Returns(jwtSection);

        _sut = new TokenService(config);
    }

    [Fact]
    public void GenerateToken_ValidUser_ReturnsNonEmptyString()
    {
        var user = BuildUser();

        var token = _sut.GenerateToken(user);

        token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void GenerateToken_ValidUser_TokenContainsCorrectSubClaim()
    {
        var user = BuildUser();

        var claims = ParseClaims(_sut.GenerateToken(user));

        claims.Should().Contain(c =>
            c.Type == JwtRegisteredClaimNames.Sub && c.Value == user.Id.ToString());
    }

    [Fact]
    public void GenerateToken_ValidUser_TokenContainsCorrectUsernameClaim()
    {
        var user = BuildUser();

        var claims = ParseClaims(_sut.GenerateToken(user));

        claims.Should().Contain(c =>
            c.Type == JwtRegisteredClaimNames.UniqueName && c.Value == user.Username);
    }

    [Fact]
    public void GenerateToken_ValidUser_TokenContainsCorrectRoleClaim()
    {
        var user = BuildUser(role: "Admin");

        var claims = ParseClaims(_sut.GenerateToken(user));

        claims.Should().Contain(c =>
            c.Type == ClaimTypes.Role && c.Value == "Admin");
    }

    [Fact]
    public void GenerateToken_ValidUser_TokenIsValidJwt()
    {
        var user = BuildUser();

        var token = _sut.GenerateToken(user);

        var handler    = new JwtSecurityTokenHandler();
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SecretKey));

        var act = () => handler.ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = Issuer,
            ValidAudience            = Audience,
            IssuerSigningKey         = signingKey
        }, out _);

        act.Should().NotThrow();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static User BuildUser(string role = "User") => new()
    {
        Id           = Guid.NewGuid(),
        Username     = "testuser",
        PasswordHash = "hash",
        Role         = role
    };

    private static IEnumerable<Claim> ParseClaims(string token)
    {
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        return jwt.Claims;
    }
}
