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
        quantity: 0,
        icon: "🍛"
    },

    chicken65: {
        id: null,
        name: "Chicken 65",
        price: 70,
        quantity: 0,
        icon: "🍗"
    },

    chapati: {
        id: null,
        name: "Chapati + Gravy",
        price: 70,
        quantity: 0,
        icon: "🥘"
    },

    combo: {
        id: null,
        name: "Combo",
        price: 170,
        quantity: 0,
        icon: "🍱"
    }

};

let selectedPayment = "Cash";


// ==========================================
// RENDER MENU
// ==========================================

function renderMenu() {

    const menuGrid =
        document.getElementById("menuGrid");

    if (!menuGrid) return;

    menuGrid.innerHTML = "";

    Object.entries(menu).forEach(([key, item]) => {

        const card = document.createElement("div");

        card.className = "menu-card";

        card.innerHTML = `
            <div class="food-icon">${item.icon}</div>
            <h3>${item.name}</h3>
            <p>₹${item.price}</p>
            <small>Freshly prepared</small>
            <div class="quantity">
                <button type="button" onclick="changeQty('${key}', -1)">−</button>
                <span id="${key}Qty">${item.quantity}</span>
                <button type="button" onclick="changeQty('${key}', 1)">+</button>
            </div>
        `;

        menuGrid.appendChild(card);

    });

}


// ==========================================
// LOAD MENU FROM SUPABASE
// ==========================================

async function loadMenu() {

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("menu_items")
            .select("*");

        if (error) {
            throw error;
        }

        data.forEach(item => {

            const key = Object.keys(menu).find(
                key => menu[key].name === item.name
            );

            if (key) {

                menu[key].id = item.id;
                menu[key].price = Number(item.price);
            }

        });

    } catch (error) {

        console.error("Menu load failed:", error);

    } finally {

        renderMenu();

    }

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


function formatCurrency(value) {
    return `₹${Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    })}`;
}


// ==========================================
// UPDATE SUMMARY
// ==========================================

async function updateSummary() {

    const todayBillsEl = document.getElementById("todayBills");
    const todaySalesEl = document.getElementById("todaySales");
    const todayItemsEl = document.getElementById("todayItems");
    const reportBillsEl = document.getElementById("reportBills");
    const reportSalesEl = document.getElementById("reportSales");
    const reportItemsEl = document.getElementById("reportItems");

    if (!todayBillsEl || !todaySalesEl || !todayItemsEl) {
        return;
    }

    try {

        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const {
            data: todayBills,
            error: billError
        } = await supabaseClient
            .from("bills")
            .select("id, total_amount, created_at")
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString());

        if (billError) {
            throw billError;
        }

        const billCount = todayBills ? todayBills.length : 0;
        const salesTotal = (todayBills || []).reduce(
            (sum, bill) => sum + Number(bill.total_amount || 0),
            0
        );

        const billIds = (todayBills || []).map(bill => bill.id);

        let itemsSold = 0;

        if (billIds.length > 0) {
            const {
                data: billItems,
                error: itemError
            } = await supabaseClient
                .from("bill_items")
                .select("bill_id, quantity");

            if (itemError) {
                throw itemError;
            }

            itemsSold = (billItems || [])
                .filter(item => billIds.includes(item.bill_id))
                .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        }

        todayBillsEl.textContent = String(billCount);
        todaySalesEl.textContent = formatCurrency(salesTotal);
        todayItemsEl.textContent = String(itemsSold);

        if (reportBillsEl) reportBillsEl.textContent = String(billCount);
        if (reportSalesEl) reportSalesEl.textContent = formatCurrency(salesTotal);
        if (reportItemsEl) reportItemsEl.textContent = String(itemsSold);

    } catch (error) {

        console.error("Summary update failed:", error);

        todayBillsEl.textContent = "0";
        todaySalesEl.textContent = "₹0";
        todayItemsEl.textContent = "0";

        if (reportBillsEl) reportBillsEl.textContent = "0";
        if (reportSalesEl) reportSalesEl.textContent = "₹0";
        if (reportItemsEl) reportItemsEl.textContent = "0";

    }

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
    ).textContent = formatCurrency(total);

    updateCustomerBalance();
}

function getCustomerAmount() {
    const customerAmountInput = document.getElementById("customerAmount");
    const value = Number(customerAmountInput ? customerAmountInput.value : 0);
    return Number.isFinite(value) ? value : 0;
}

function updateCustomerBalance() {
    const total = getTotal();
    const customerAmount = getCustomerAmount();
    const remaining = total - customerAmount;
    const change = customerAmount - total;

    const remainingAmount = document.getElementById("remainingAmount");
    const changeAmount = document.getElementById("changeAmount");

    if (remainingAmount) {
        remainingAmount.textContent = formatCurrency(Math.max(remaining, 0));
    }

    if (changeAmount) {
        changeAmount.textContent = formatCurrency(Math.max(change, 0));
    }

    if (total === 0) {
        if (remainingAmount) remainingAmount.textContent = "₹0";
        if (changeAmount) changeAmount.textContent = "₹0";
    }
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

    await updateSummary();

    alert(
        `Bill #${bill.bill_no} saved successfully!`
    );

}


// ==========================================
// NEW BILL
// ==========================================

function newBill() {

    Object.keys(menu).forEach(key => {
        menu[key].quantity = 0;
    });

    document.getElementById("billNumber").textContent = "New Bill";

    selectPayment("Cash");
    renderMenu();
    updateBill();
}


// ==========================================
// PAYMENT SELECTION
// ==========================================

function selectPayment(payment) {

    selectedPayment = payment;

    const buttons = document.querySelectorAll(".payment-btn");

    buttons.forEach(button => {
        const isActive = button.dataset.payment === payment;
        button.classList.toggle("active", isActive);
    });

}


// ==========================================
// CLEAR BILL
// ==========================================

function clearBill() {

    Object.keys(menu).forEach(key => {

        menu[key].quantity = 0;

        const qtyEl = document.getElementById(`${key}Qty`);
        if (qtyEl) qtyEl.textContent = "0";

    });

    const customerAmountInput = document.getElementById("customerAmount");
    if (customerAmountInput) {
        customerAmountInput.value = "0";
    }

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
// LOAD SALES
// ==========================================

async function loadSales() {

    const salesTable = document.getElementById("salesTable");

    if (!salesTable) return;

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("bills")
            .select("*")
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            salesTable.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty">No sales yet</td>
                </tr>
            `;
            return;
        }

        salesTable.innerHTML = data.map(bill => {
            const createdAt = new Date(bill.created_at || Date.now());
            const billNo = bill.bill_no ?? `#${bill.id}`;
            const payment = bill.payment_method ?? "Cash";
            const amount = Number(bill.total_amount || 0);

            return `
                <tr>
                    <td>${billNo}</td>
                    <td>${createdAt.toLocaleDateString("en-IN")}</td>
                    <td>${createdAt.toLocaleTimeString("en-IN")}</td>
                    <td>${payment}</td>
                    <td>${formatCurrency(amount)}</td>
                </tr>
            `;
        }).join("");

    } catch (error) {

        console.error("Sales load failed:", error);

        salesTable.innerHTML = `
            <tr>
                <td colspan="5" class="table-empty">Unable to load sales</td>
            </tr>
        `;

    }

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
// DATE / TIME
// ==========================================

function updateClock() {

    const dateEl = document.getElementById("currentDate");
    const timeEl = document.getElementById("currentTime");

    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );
    }

    if (timeEl) {
        timeEl.textContent = new Date().toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
    }

}

updateClock();
setInterval(updateClock, 1000);


// ==========================================
// START
// ==========================================

selectPayment("Cash");
loadMenu();
loadSales();
updateSummary();
updateBill();