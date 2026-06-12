using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuangTrung.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddZaloPayOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ZaloPayOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AppTransId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AmountVnd = table.Column<long>(type: "bigint", nullable: false),
                    Description = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ZpTransId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: true),
                    RecordedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZaloPayOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ZaloPayOrders_AspNetUsers_RecordedByUserId",
                        column: x => x.RecordedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ZaloPayOrders_Payments_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "Payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ZaloPayOrders_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ZaloPayOrders_AppTransId",
                table: "ZaloPayOrders",
                column: "AppTransId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ZaloPayOrders_PaymentId",
                table: "ZaloPayOrders",
                column: "PaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_ZaloPayOrders_RecordedByUserId",
                table: "ZaloPayOrders",
                column: "RecordedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ZaloPayOrders_StudentId",
                table: "ZaloPayOrders",
                column: "StudentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ZaloPayOrders");
        }
    }
}
