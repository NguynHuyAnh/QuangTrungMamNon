namespace QuangTrung.Application.Auth;

public sealed record RegisterParentRequest(
    string Email,
    string Password,
    string FullName,
    Guid? StudentIdToLink,
    string? StudentRegistrationCodeToLink);

public sealed record RegisterStaffRequest(string Email, string Password, string FullName, string Role);
