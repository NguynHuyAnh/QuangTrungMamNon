import { useState } from "react";
import {leaveRequests,LeaveRequest,} from "../store/leaveStore";

export function ParentLeavePage() {
    const [keyword, setKeyword] = useState("");

    const [requests, setRequests] =
    useState<LeaveRequest[]>(leaveRequests);

    
const [showForm, setShowForm] = useState(false);

const [newRequest, setNewRequest] = useState({
    studentName: "",
    className: "",
    leaveDate: "",
    reason: "",
    status: "Chờ duyệt",
});

const addRequest = () => {

    if (
        !newRequest.studentName ||
        !newRequest.leaveDate ||
        !newRequest.reason
    ) {
        alert("Vui lòng nhập đầy đủ thông tin");
        return;
    }

    const request: LeaveRequest = {
        id: Date.now(),
        ...newRequest,
    };

    leaveRequests.push(request); setRequests([...leaveRequests]);

    setShowForm(false);

    setNewRequest({
        studentName: "",
        className: "",
        leaveDate: "",
        reason: "",
        status: "Chờ duyệt",
    });
};



    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">

                <div>

                    <h1 className="text-3xl font-bold text-slate-800">
                        Xin nghỉ phép
                    </h1>

                    <p className="mt-1 text-slate-500">
                        Phụ huynh gửi đơn xin nghỉ cho học sinh
                    </p>

                </div>

                <button
                    onClick={() => setShowForm(true)}
                    className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow hover:bg-blue-800"
                >
                    + Tạo đơn
                </button>

            </div>

            {/* Card */}
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

            {/* Search */}
            <div className="rounded-xl bg-white p-5 shadow">

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                    <input
                        type="text"
                        placeholder="Tìm học sinh..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="rounded-lg border border-slate-300 px-4 py-2"
                    />

                    <input
                        type="date"
                        className="rounded-lg border border-slate-300 px-4 py-2"
                    />

                    <button
                        className="rounded-lg bg-slate-100 px-4 py-2 font-semibold hover:bg-slate-200"
                    >
                        Làm mới
                    </button>

                </div>

            </div>

            {/* Table */}
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

            
{showForm && (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">

                <h2 className="text-2xl font-bold">
                    Tạo đơn xin nghỉ
                </h2>

                <button
                    onClick={() => setShowForm(false)}
                    className="text-2xl text-slate-500 hover:text-red-500"
                >
                    ✕
                </button>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>

                    <label className="mb-2 block text-sm font-semibold">
                        Học sinh
                    </label>

                    <select
                        value={newRequest.studentName}
                        onChange={(e) =>
                            setNewRequest({
                                ...newRequest,
                                studentName: e.target.value,
                            })
                        }
                        className="w-full rounded-lg border px-3 py-2"
                    >
                        <option value="">
                            Chọn học sinh
                        </option>

                        <option>Nguyễn Văn A</option>

                        <option>Nguyễn Văn B</option>

                    </select>

                </div>

                <div>

                    <label className="mb-2 block text-sm font-semibold">
                        Lớp
                    </label>

                    <input
                        type="text"
                        value={newRequest.className}
                        onChange={(e) =>
                            setNewRequest({
                                ...newRequest,
                                className: e.target.value,
                            })
                        }
                        className="w-full rounded-lg border px-3 py-2"
                        placeholder="Nhập tên lớp"
                    />

                </div>

                <div>

                    <label className="mb-2 block text-sm font-semibold">
                        Ngày nghỉ
                    </label>

                    <input
                        type="date"
                        value={newRequest.leaveDate}
                        onChange={(e) =>
                            setNewRequest({
                                ...newRequest,
                                leaveDate: e.target.value,
                            })
                        }
                        className="w-full rounded-lg border px-3 py-2"
                    />

                </div>

                <div className="md:col-span-2">

                    <label className="mb-2 block text-sm font-semibold">
                        Lý do nghỉ
                    </label>

                    <textarea
                        rows={4}
                        value={newRequest.reason}
                        onChange={(e) =>
                            setNewRequest({
                                ...newRequest,
                                reason: e.target.value,
                            })
                        }
                        className="w-full rounded-lg border px-3 py-2"
                        placeholder="Nhập lý do nghỉ"
                    />

                </div>

            </div>

            <div className="mt-6 flex justify-end gap-3">

                <button
                    onClick={() => setShowForm(false)}
                    className="rounded-lg bg-slate-200 px-5 py-2"
                >
                    Hủy
                </button>

                <button
                    onClick={addRequest}
                    className="rounded-lg bg-blue-700 px-5 py-2 text-white"
                >
                    Gửi đơn
                </button>

            </div>

        </div>

    </div>

)}



        </div>
    );
}

