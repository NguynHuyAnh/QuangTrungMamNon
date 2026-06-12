using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using QuangTrung.Api.Authorization;

using QuangTrung.Api.Helpers;

using QuangTrung.Application.Common;

using QuangTrung.Application.Constants;

using QuangTrung.Domain.Entities;

using QuangTrung.Domain.Enums;

using QuangTrung.Infrastructure.Persistence;

using System.Security.Claims;



namespace QuangTrung.Api.Controllers;



[ApiController]

[Route("api/payments")]

public sealed class PaymentsController(ApplicationDbContext db) : ControllerBase

{

    public sealed record PaymentRow(

        Guid Id,

        Guid StudentId,

        string StudentFullName,

        string? StudentRegistrationCode,

        string? CurrentClassName,

        string? FeeLineDescription,

        Guid? StudentFeeAssignmentId,

        decimal Amount,

        DateTime PaidAt,

        PaymentMethod Method,

        string? ReceiptNumber,

        string? Note);



    public sealed record PaymentInvoiceDetail(

        Guid Id,

        Guid StudentId,

        string StudentFullName,

        string? StudentRegistrationCode,

        string? CurrentClassName,

        string? FeeLineDescription,

        Guid? StudentFeeAssignmentId,

        decimal Amount,

        DateTime PaidAt,

        PaymentMethod Method,

        string? ReceiptNumber,

        string? Note,

        string SchoolTitle);



    private static IQueryable<Payment> PaymentsQueryForUser(ClaimsPrincipal user, ApplicationDbContext db, Guid userId)

    {

        var query = db.Payments.AsNoTracking();

        if (user.IsInRole(AppRoles.PhuHuynh))

        {

            var childIds = db.UserStudentLinks.AsNoTracking()

                .Where(x => x.UserId == userId)

                .Select(x => x.StudentId);

            query = query.Where(x => childIds.Contains(x.StudentId));

        }



        return query;

    }



    [HttpGet]

    [Authorize(Policy = AppPolicies.PaymentsReadSummary)]

    public async Task<ActionResult<PagedResult<PaymentRow>>> GetList(

        [FromQuery] Guid? studentId,

        [FromQuery] Guid? classId,

        [FromQuery] string? q,

        [FromQuery] DateTime? from,

        [FromQuery] DateTime? to,

        [FromQuery] int page = 1,

        [FromQuery] int pageSize = 20,

        CancellationToken ct = default)

    {

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var (p, ps, skip) = Pagination.Normalize(page, pageSize);

        var query = from pay in db.Payments.AsNoTracking()

                    join st in db.Students.AsNoTracking() on pay.StudentId equals st.Id

                    where !st.IsDeleted

                    select new { pay, StudentName = st.FullName, Reg = st.RegistrationCode };



        if (User.IsInRole(AppRoles.PhuHuynh))

        {

            var childIds = await db.UserStudentLinks.AsNoTracking()

                .Where(x => x.UserId == userId)

                .Select(x => x.StudentId)

                .ToListAsync(ct);

            query = query.Where(x => childIds.Contains(x.pay.StudentId));

            if (studentId is not null && !childIds.Contains(studentId.Value))

                return Forbid();

        }



        if (studentId is not null)

            query = query.Where(x => x.pay.StudentId == studentId);

        if (classId is not null)

        {

            query = query.Where(x => db.StudentClassAssignments.Any(sca =>

                sca.StudentId == x.pay.StudentId && sca.ToDate == null && sca.ClassId == classId));

        }



        if (!string.IsNullOrWhiteSpace(q))

        {

            var qq = q.Trim();

            query = query.Where(x => x.StudentName.Contains(qq));

        }



        if (from is not null)

            query = query.Where(x => x.pay.PaidAt >= from);

        if (to is not null)

            query = query.Where(x => x.pay.PaidAt <= to);

        var total = await query.CountAsync(ct);

        var slice = await query.OrderByDescending(x => x.pay.PaidAt).Skip(skip).Take(ps)

            .Select(x => new

            {

                x.pay.Id,

                x.pay.StudentId,

                x.StudentName,

                x.Reg,

                x.pay.Amount,

                x.pay.PaidAt,

                x.pay.Method,

                x.pay.ReceiptNumber,

                x.pay.Note,

                x.pay.StudentFeeAssignmentId,

            })

            .ToListAsync(ct);



        var studentIds = slice.Select(s => s.StudentId).Distinct().ToList();

        var classRows = await (

            from sca in db.StudentClassAssignments.AsNoTracking()

            join c in db.Classes.AsNoTracking() on sca.ClassId equals c.Id

            where studentIds.Contains(sca.StudentId) && sca.ToDate == null && !c.IsDeleted

            select new { sca.StudentId, c.Name }

        ).ToListAsync(ct);

        var classNameByStudent = new Dictionary<Guid, string>();

        foreach (var r in classRows)

        {

            if (!classNameByStudent.ContainsKey(r.StudentId))

                classNameByStudent[r.StudentId] = r.Name;

        }



        var aidIds = slice.Where(s => s.StudentFeeAssignmentId is not null).Select(s => s.StudentFeeAssignmentId!.Value).Distinct().ToList();

        var feeByAssignId = new Dictionary<Guid, string>();

        if (aidIds.Count > 0)

        {

            var feeRows = await (

                from a in db.StudentFeeAssignments.AsNoTracking()

                join f in db.FeeStructures.AsNoTracking() on a.FeeStructureId equals f.Id

                join y in db.SchoolYears.AsNoTracking() on a.SchoolYearId equals y.Id

                where aidIds.Contains(a.Id) && !f.IsDeleted && !y.IsDeleted

                select new { a.Id, f.Name, a.Month, YearName = y.Name }

            ).ToListAsync(ct);

            foreach (var fr in feeRows)

                feeByAssignId[fr.Id] = $"{fr.Name} · Tháng {fr.Month} · {fr.YearName}";

        }



        var items = slice.Select(s =>

        {

            classNameByStudent.TryGetValue(s.StudentId, out var cls);

            string? feeDesc = null;

            if (s.StudentFeeAssignmentId is { } aid && feeByAssignId.TryGetValue(aid, out var fd))

                feeDesc = fd;

            return new PaymentRow(

                s.Id,

                s.StudentId,

                s.StudentName,

                s.Reg,

                cls,

                feeDesc,

                s.StudentFeeAssignmentId,

                s.Amount,

                s.PaidAt,

                s.Method,

                s.ReceiptNumber,

                s.Note);

        }).ToList();



        return Ok(new PagedResult<PaymentRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });

    }



    [HttpGet("summary")]

    [Authorize(Policy = AppPolicies.PaymentsReadSummary)]

    public async Task<IActionResult> Summary(

        [FromQuery] Guid? studentId,

        [FromQuery] Guid? classId,

        [FromQuery] string? q,

        [FromQuery] DateTime? from,

        [FromQuery] DateTime? to,

        CancellationToken ct = default)

    {

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var query = from pay in PaymentsQueryForUser(User, db, userId)

                    join st in db.Students.AsNoTracking() on pay.StudentId equals st.Id

                    where !st.IsDeleted

                    select new { pay, StudentName = st.FullName };



        if (User.IsInRole(AppRoles.PhuHuynh) && studentId is not null)

        {

            var childIds = await db.UserStudentLinks.AsNoTracking()

                .Where(x => x.UserId == userId)

                .Select(x => x.StudentId)

                .ToListAsync(ct);

            if (!childIds.Contains(studentId.Value))

                return Forbid();

        }



        if (studentId is not null)

            query = query.Where(x => x.pay.StudentId == studentId);

        if (classId is not null)

        {

            query = query.Where(x => db.StudentClassAssignments.Any(sca =>

                sca.StudentId == x.pay.StudentId && sca.ToDate == null && sca.ClassId == classId));

        }



        if (!string.IsNullOrWhiteSpace(q))

        {

            var qq = q.Trim();

            query = query.Where(x => x.StudentName.Contains(qq));

        }



        if (from is not null)

            query = query.Where(x => x.pay.PaidAt >= from);

        if (to is not null)

            query = query.Where(x => x.pay.PaidAt <= to);

        var total = await query.SumAsync(x => (decimal?)x.pay.Amount, ct) ?? 0m;

        return Ok(new { totalAmount = total });

    }



    [HttpGet("{id:guid}")]

    [Authorize(Policy = AppPolicies.PaymentsReadSummary)]

    public async Task<ActionResult<PaymentInvoiceDetail>> GetOne(Guid id, CancellationToken ct)

    {

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var query = from pay in db.Payments.AsNoTracking()

                    join st in db.Students.AsNoTracking() on pay.StudentId equals st.Id

                    where !st.IsDeleted && pay.Id == id

                    select new { pay, StudentName = st.FullName, Reg = st.RegistrationCode };



        if (User.IsInRole(AppRoles.PhuHuynh))

        {

            var childIds = await db.UserStudentLinks.AsNoTracking()

                .Where(x => x.UserId == userId)

                .Select(x => x.StudentId)

                .ToListAsync(ct);

            query = query.Where(x => childIds.Contains(x.pay.StudentId));

        }



        var row = await query.Select(x => new

        {

            x.pay.Id,

            x.pay.StudentId,

            x.StudentName,

            x.Reg,

            x.pay.Amount,

            x.pay.PaidAt,

            x.pay.Method,

            x.pay.ReceiptNumber,

            x.pay.Note,

            x.pay.StudentFeeAssignmentId,

        }).FirstOrDefaultAsync(ct);

        if (row is null)

            return NotFound();



        var clsName = await (

            from sca in db.StudentClassAssignments.AsNoTracking()

            join c in db.Classes.AsNoTracking() on sca.ClassId equals c.Id

            where row.StudentId == sca.StudentId && sca.ToDate == null && !c.IsDeleted

            select c.Name

        ).FirstOrDefaultAsync(ct);



        string? feeDesc = null;

        if (row.StudentFeeAssignmentId is { } aid)

        {

            var feePack = await (

                from a in db.StudentFeeAssignments.AsNoTracking()

                join f in db.FeeStructures.AsNoTracking() on a.FeeStructureId equals f.Id

                join y in db.SchoolYears.AsNoTracking() on a.SchoolYearId equals y.Id

                where a.Id == aid && !f.IsDeleted && !y.IsDeleted

                select new { f.Name, a.Month, YearName = y.Name }

            ).FirstOrDefaultAsync(ct);

            if (feePack is not null)

                feeDesc = $"{feePack.Name} · Tháng {feePack.Month} · {feePack.YearName}";

        }



        var detail = new PaymentInvoiceDetail(

            row.Id,

            row.StudentId,

            row.StudentName,

            row.Reg,

            clsName,

            feeDesc,

            row.StudentFeeAssignmentId,

            row.Amount,

            row.PaidAt,

            row.Method,

            row.ReceiptNumber,

            row.Note,

            "Trường Mầm non Quang Trung");

        return Ok(detail);

    }



    public sealed record UpdatePaymentDto(string? ReceiptNumber, string? Note);



    [HttpPut("{id:guid}")]

    [Authorize(Policy = AppPolicies.PaymentsWrite)]

    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePaymentDto dto, CancellationToken ct)

    {

        var entity = await db.Payments.FirstOrDefaultAsync(x => x.Id == id, ct);

        if (entity is null)

            return NotFound();

        entity.ReceiptNumber = string.IsNullOrWhiteSpace(dto.ReceiptNumber) ? null : dto.ReceiptNumber.Trim();

        entity.Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();

        await db.SaveChangesAsync(ct);

        return NoContent();

    }



    [HttpDelete("{id:guid}")]

    [Authorize(Policy = AppPolicies.PaymentsWrite)]

    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)

    {

        var entity = await db.Payments.FirstOrDefaultAsync(x => x.Id == id, ct);

        if (entity is null)

            return NotFound();

        db.Payments.Remove(entity);

        await db.SaveChangesAsync(ct);

        return NoContent();

    }



    public sealed record CreatePaymentDto(Guid StudentId, decimal Amount, PaymentMethod Method, string? ReceiptNumber, string? Note);



    [HttpPost]

    [Authorize(Policy = AppPolicies.PaymentsWrite)]

    public async Task<IActionResult> Create([FromBody] CreatePaymentDto dto, CancellationToken ct)

    {

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var payment = new Payment

        {

            Id = Guid.NewGuid(),

            StudentId = dto.StudentId,

            Amount = dto.Amount,

            PaidAt = DateTime.UtcNow,

            Method = dto.Method,

            ReceiptNumber = dto.ReceiptNumber,

            Note = dto.Note,

            RecordedByUserId = userId,

            CreatedAt = DateTime.UtcNow

        };

        db.Payments.Add(payment);

        await db.SaveChangesAsync(ct);

        return Ok(new { payment.Id });

    }



    public sealed record CreatePaymentsForAssignmentsDto(

        Guid StudentId,

        PaymentMethod Method,

        string? ReceiptNumber,

        string? Note,

        IReadOnlyList<Guid> StudentFeeAssignmentIds);



    /// <summary>Ghi nhận thanh toán theo từng dòng gán phí (số tiền = phần còn lại của từng dòng).</summary>

    [HttpPost("for-assignments")]

    [Authorize(Policy = AppPolicies.PaymentsWrite)]

    public async Task<IActionResult> CreateForAssignments([FromBody] CreatePaymentsForAssignmentsDto dto, CancellationToken ct)

    {

        if (dto.StudentFeeAssignmentIds.Count == 0)

            return BadRequest(new { message = "Chọn ít nhất một khoản phí còn nợ." });



        var distinctIds = dto.StudentFeeAssignmentIds.Distinct().ToList();

        if (distinctIds.Count != dto.StudentFeeAssignmentIds.Count)

            return BadRequest(new { message = "Danh sách khoản phí không hợp lệ (trùng lặp)." });



        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var now = DateTime.UtcNow;



        await using var tx = await db.Database.BeginTransactionAsync(ct);

        foreach (var aid in distinctIds)

        {

            var pack = await (

                from a in db.StudentFeeAssignments.AsNoTracking()

                join f in db.FeeStructures.AsNoTracking() on a.FeeStructureId equals f.Id

                join st in db.Students.AsNoTracking() on a.StudentId equals st.Id

                where a.Id == aid && !f.IsDeleted && !st.IsDeleted

                select new

                {

                    a.StudentId,

                    Resolved = a.AmountOverride ?? f.Amount,

                    FeeName = f.Name,

                }).FirstOrDefaultAsync(ct);

            if (pack is null)

            {

                await tx.RollbackAsync(ct);

                return BadRequest(new { message = "Không tìm thấy một khoản gán phí đã chọn." });

            }



            if (pack.StudentId != dto.StudentId)

            {

                await tx.RollbackAsync(ct);

                return BadRequest(new { message = "Một hoặc nhiều khoản phí không thuộc học sinh đã chọn." });

            }



            var paid = await db.Payments.AsNoTracking()

                .Where(p => p.StudentFeeAssignmentId == aid)

                .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;

            var remaining = pack.Resolved - paid;

            if (remaining < 0m)

                remaining = 0m;

            if (remaining <= 0m)

            {

                await tx.RollbackAsync(ct);

                return BadRequest(new { message = $"Khoản «{pack.FeeName}» đã thu đủ. Làm mới danh sách và chọn lại." });

            }



            db.Payments.Add(new Payment

            {

                Id = Guid.NewGuid(),

                StudentId = dto.StudentId,

                StudentFeeAssignmentId = aid,

                Amount = remaining,

                PaidAt = now,

                Method = dto.Method,

                ReceiptNumber = dto.ReceiptNumber,

                Note = dto.Note,

                RecordedByUserId = userId,

                CreatedAt = now

            });

        }



        await db.SaveChangesAsync(ct);

        await tx.CommitAsync(ct);

        return Ok(new { count = distinctIds.Count });

    }

}


