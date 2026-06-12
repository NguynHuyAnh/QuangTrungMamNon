using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuangTrung.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PaymentAndZaloPayLinkFeeAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "StudentFeeAssignmentId",
                table: "ZaloPayOrders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "StudentFeeAssignmentId",
                table: "Payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ZaloPayOrders_StudentFeeAssignmentId",
                table: "ZaloPayOrders",
                column: "StudentFeeAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_StudentFeeAssignmentId",
                table: "Payments",
                column: "StudentFeeAssignmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_StudentFeeAssignments_StudentFeeAssignmentId",
                table: "Payments",
                column: "StudentFeeAssignmentId",
                principalTable: "StudentFeeAssignments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ZaloPayOrders_StudentFeeAssignments_StudentFeeAssignmentId",
                table: "ZaloPayOrders",
                column: "StudentFeeAssignmentId",
                principalTable: "StudentFeeAssignments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payments_StudentFeeAssignments_StudentFeeAssignmentId",
                table: "Payments");

            migrationBuilder.DropForeignKey(
                name: "FK_ZaloPayOrders_StudentFeeAssignments_StudentFeeAssignmentId",
                table: "ZaloPayOrders");

            migrationBuilder.DropIndex(
                name: "IX_ZaloPayOrders_StudentFeeAssignmentId",
                table: "ZaloPayOrders");

            migrationBuilder.DropIndex(
                name: "IX_Payments_StudentFeeAssignmentId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "StudentFeeAssignmentId",
                table: "ZaloPayOrders");

            migrationBuilder.DropColumn(
                name: "StudentFeeAssignmentId",
                table: "Payments");
        }
    }
}
