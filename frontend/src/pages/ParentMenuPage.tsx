
export function ParentMenuPage() {

    const todayMenu = {
        date: "2026-06-24",
        className: "Lá 1",
        breakfast: {
            name: "Cháo sườn",
            time: "07:30",
        },
        lunch: {
            name: "Cơm thịt băm",
            time: "11:00",
        },
        snack: {
            name: "Sữa tươi",
            time: "14:30",
        },
    };
    
    return (

        <div className="space-y-6">

            <div>

                <h1 className="text-3xl font-bold text-slate-800">
                    Thực đơn hôm nay
                </h1>

                <p className="mt-1 text-slate-500">
                    Thực đơn dành cho phụ huynh
                </p>

            </div>

            <div className="rounded-2xl bg-white p-6 shadow">

                <h2 className="text-xl font-bold text-blue-700">
                    {todayMenu.className}
                </h2>

                <p className="mt-1 text-slate-500">
                    {todayMenu.date}
                </p>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                <div className="rounded-2xl bg-white p-6 shadow">

                    <h3 className="text-lg font-bold text-orange-500">
                        Bữa sáng
                    </h3>

                    <p className="mt-4 text-xl">
                        {todayMenu.breakfast.name}
                    </p>

                    <p className="mt-2 text-slate-500">
                        {todayMenu.breakfast.time}
                    </p>

                </div>

                <div className="rounded-2xl bg-white p-6 shadow">

                    <h3 className="text-lg font-bold text-green-600">
                        Bữa trưa
                    </h3>

                    <p className="mt-4 text-xl">
                        {todayMenu.lunch.name}
                    </p>

                    <p className="mt-2 text-slate-500">
                        {todayMenu.lunch.time}
                    </p>

                </div>

                <div className="rounded-2xl bg-white p-6 shadow">

                    <h3 className="text-lg font-bold text-purple-600">
                        Bữa phụ
                    </h3>

                    <p className="mt-4 text-xl">
                        {todayMenu.snack.name}
                    </p>

                    <p className="mt-2 text-slate-500">
                        {todayMenu.snack.time}
                    </p>

                </div>

            </div>

        </div>

    );
}

