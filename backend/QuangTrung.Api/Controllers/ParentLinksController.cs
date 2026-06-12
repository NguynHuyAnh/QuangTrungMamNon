using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Domain.Entities;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Api.Controllers;

[ApiController]
[Route("api/parent-links")]
[Authorize(Policy = AppPolicies.ParentLinksManage)]
public sealed class ParentLinksController(ApplicationDbContext db) : ControllerBase
{
    public sealed record CreateLinkDto(Guid UserId, Guid StudentId, string Relationship, bool IsPrimary);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLinkDto dto, CancellationToken ct)
    {
        if (!await db.Users.AnyAsync(u => u.Id == dto.UserId, ct))
            return BadRequest("User không tồn tại.");
        if (!await db.Students.AnyAsync(s => s.Id == dto.StudentId && !s.IsDeleted, ct))
            return BadRequest("Học sinh không tồn tại.");
        if (await db.UserStudentLinks.AnyAsync(x => x.UserId == dto.UserId && x.StudentId == dto.StudentId, ct))
            return Conflict("Liên kết đã tồn tại.");

        db.UserStudentLinks.Add(new UserStudentLink
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            StudentId = dto.StudentId,
            Relationship = dto.Relationship.Trim(),
            IsPrimary = dto.IsPrimary,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpDelete]
    public async Task<IActionResult> Delete([FromQuery] Guid userId, [FromQuery] Guid studentId, CancellationToken ct)
    {
        var link = await db.UserStudentLinks.FirstOrDefaultAsync(x => x.UserId == userId && x.StudentId == studentId, ct);
        if (link is null)
            return NotFound();
        db.UserStudentLinks.Remove(link);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
