// ==========================================
// SUPABASE CONFIG
// ==========================================

const SUPABASE_URL = "https://nummvjlrobguzxelufic.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51bW12amxyb2JndXp4ZWx1ZmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxOTI2OTAsImV4cCI6MjEwNTc2ODY5MH0.NEIu3eJcBFbSSUoCAUFGRs63cttj2HOwhbmkmGB-jZU";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ==========================================
// MENU
// ==========================================

const menu = {

    biryani: {
        id: null,
        name: "Biryani",
        price: 130,
        quantity: 0
    },

    chicken65: {
        id: null,
        name: "Chicken 65",
        price: 70,
        quantity: 0
    },

    chapati: {
        id: null,
        name: "Chapati + Gravy",
        price: 70,
        quantity: 0
    },

    combo: {
        id: null,
        name: "Combo",
        price: 170,
        quantity: 0
    }

};


// ==========================================
// LOAD MENU FROM SUPABASE
// ==========================================

async function loadMenu() {

    const {
        data,
        error
    } = await supabaseClient
        .from("menu_items")
        .select("*");

    if (error) {

        console.error(error);

        alert(
            "Unable to load menu from Supabase."
        );

        return;
    }

    data.forEach(item => {

        const key = Object.keys(menu).find(
            key => menu[key].name === item.name
        );

        if (key) {

            menu[key].id = item.id;

            menu[key].price =
                Number(item.price);
        }

    });

}


// ==========================================
// CHANGE QUANTITY
// ==========================================

function changeQty(item, amount) {

    menu[item].quantity += amount;

    if (menu[item].quantity < 0) {
        menu[item].quantity = 0;
    }

    document.getElementById(
        `${item}Qty`
    ).textContent =
        menu[item].quantity;

    updateBill();
}


// ==========================================
// UPDATE BILL
// ==========================================

function updateBill() {

    const billItems =
        document.getElementById("billItems");

    let total = 0;

    let html = "";

    Object.values(menu).forEach(item => {

        if (item.quantity > 0) {

            const subtotal =
                item.quantity * item.price;

            total += subtotal;

            html += `
                <div class="bill-row">

                    <div>
                        <strong>
                            ${item.name}
                        </strong>

                        <small>
                            ${item.quantity}
                            × ₹${item.price}
                        </small>
                    </div>

                    <strong>
                        ₹${subtotal}
                    </strong>

                </div>
            `;
        }

    });


    if (!html) {

        html = `
            <div class="empty">
                No items selected
            </div>
        `;
    }

    billItems.innerHTML = html;

    document.getElementById(
        "grandTotal"
    ).textContent = `₹${total}`;
}


// ==========================================
// GET TOTAL
// ==========================================

function getTotal() {

    return Object.values(menu)
        .reduce(
            (total, item) =>
                total +
                item.quantity * item.price,
            0
        );
}


// ==========================================
// SAVE BILL
// ==========================================

async function saveBill() {

    const total = getTotal();

    if (total === 0) {

        alert(
            "Please select at least one item."
        );

        return;
    }


    const {
        data: bill,
        error: billError
    } = await supabaseClient
        .from("bills")
        .insert({

            total_amount: total

        })
        .select()
        .single();


    if (billError) {

        console.error(billError);

        alert(
            "Failed to save bill."
        );

        return;
    }


    const billItems = [];


    Object.values(menu).forEach(item => {

        if (item.quantity > 0) {

            billItems.push({

                bill_id: bill.id,

                menu_item_id: item.id,

                item_name: item.name,

                quantity: item.quantity,

                unit_price: item.price,

                subtotal:
                    item.quantity *
                    item.price

            });

        }

    });


    const {
        error: itemError
    } = await supabaseClient
        .from("bill_items")
        .insert(billItems);


    if (itemError) {

        console.error(itemError);

        alert(
            "Bill created but items failed to save."
        );

        return;
    }


    document.getElementById(
        "billNumber"
    ).textContent =
        `Bill #${bill.bill_no}`;


    alert(
        `Bill #${bill.bill_no} saved successfully!`
    );

}


// ==========================================
// CLEAR BILL
// ==========================================

function clearBill() {

    Object.keys(menu).forEach(key => {

        menu[key].quantity = 0;

        document.getElementById(
            `${key}Qty`
        ).textContent = "0";

    });


    document.getElementById(
        "billNumber"
    ).textContent = "New Bill";


    updateBill();
}


// ==========================================
// PRINT BILL
// ==========================================

function printBill() {

    if (getTotal() === 0) {

        alert(
            "Please add items before printing."
        );

        return;
    }

    window.print();
}


// ==========================================
// EXPORT EXCEL / CSV
// ==========================================

async function exportExcel() {

    const {
        data,
        error
    } = await supabaseClient
        .from("bills")
        .select(`
            bill_no,
            total_amount,
            created_at,
            bill_items (
                item_name,
                quantity,
                unit_price,
                subtotal
            )
        `)
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        alert(
            "Unable to export sales."
        );

        return;
    }


    let csv =
        "Bill No,Date,Time,Item,Quantity,Unit Price,Subtotal,Total\n";


    data.forEach(bill => {

        bill.bill_items.forEach(item => {

            const date =
                new Date(
                    bill.created_at
                );

            csv +=
                `${bill.bill_no},` +
                `${date.toLocaleDateString()},` +
                `${date.toLocaleTimeString()},` +
                `"${item.item_name}",` +
                `${item.quantity},` +
                `${item.unit_price},` +
                `${item.subtotal},` +
                `${bill.total_amount}\n`;

        });

    });


    const blob =
        new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        `biryani-sales-${new Date()
            .toISOString()
            .split("T")[0]
        }.csv`;

    link.click();

    URL.revokeObjectURL(url);
}


// ==========================================
// DATE
// ==========================================

document.getElementById(
    "currentDate"
).textContent =
    new Date().toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );


// ==========================================
// START
// ==========================================

loadMenu();

updateBill();