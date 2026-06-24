import { useState } from "react";
import {leaveRequests,LeaveRequest,} from "../store/leaveStore";

export function PrincipalLeavePage() {
    const [requests] =
    useState<LeaveRequest[]>(leaveRequests);

    return (
        <div className="space-y-6">

            <div>

                <h1 className="text-3xl font-bold text-slate-800">
                    Quản lý nghỉ phép
                </h1>

                <p className="mt-1 text-slate-500">
                    Hiệu trưởng theo dõi toàn bộ đơn nghỉ
                </p>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

                <div className="rounded-xl bg-white p-5 shadow">
                    <p className="text-sm text-slate-500">
                        Tổng đơn
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-blue-700">
                        {requests.length}
                    </h2>
                </div>

                <div className="rounded-xl bg-white p-5 shadow">
                    <p className="text-sm text-slate-500">
                        Chờ duyệt
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-orange-500">
                        {
                            requests.filter(
                                item => item.status === "Chờ duyệt"
                            ).length
                        }
                    </h2>
                </div>

                <div className="rounded-xl bg-white p-5 shadow">
                    <p className="text-sm text-slate-500">
                        Đã duyệt
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-green-600">
                        {
                            requests.filter(
                                item => item.status === "Đã duyệt"
                            ).length
                        }
                    </h2>
                </div>

                <div className="rounded-xl bg-white p-5 shadow">
                    <p className="text-sm text-slate-500">
                        Từ chối
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-red-500">
                        {
                            requests.filter(
                                item => item.status === "Từ chối"
                            ).length
                        }
                    </h2>
                </div>

            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow">

                <table className="min-w-full">

                    <thead className="bg-blue-700 text-white">

                        <tr>
                            <th className="px-6 py-4 text-left">
                                Học sinh
                            </th>

                            <th className="px-6 py-4 text-left">
                                Lớp
                            </th>

                            <th className="px-6 py-4 text-left">
                                Ngày nghỉ
                            </th>

                            <th className="px-6 py-4 text-left">
                                Lý do
                            </th>

                            <th className="px-6 py-4 text-left">
                                Trạng thái
                            </th>
                        </tr>

                    </thead>

                    <tbody>

                        {requests.map((request) => (

                            <tr
                                key={request.id}
                                className="border-b hover:bg-slate-50"
                            >

                                <td className="px-6 py-4">
                                    {request.studentName}
                                </td>

                                <td className="px-6 py-4">
                                    {request.className}
                                </td>

                                <td className="px-6 py-4">
                                    {request.leaveDate}
                                </td>

                                <td className="px-6 py-4">
                                    {request.reason}
                                </td>

                                <td className="px-6 py-4">
                                    {request.status}
                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>
    );
}

