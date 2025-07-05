// Функция для расчета бонуса по прибыли
function calculateBonusByProfit(index, total, seller) {
    const profit = seller.profit;
    let bonus = 0;

    if (index === 0) {
        bonus = profit * 0.15; // 15%
    } else if (index === 1 || index === 2) {
        bonus = profit * 0.10; // 10%
    } else if (index === total - 1) {
        bonus = 0; // 0%
    } else {
        bonus = profit * 0.05; // 5%
    }

    // Округляем до 2 знаков
    return Math.round(bonus * 100) / 100;
}

// Обеспечивает преобразование значения в число
function toNumber(value) {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
}

// Функция для расчета выручки
function calculateSimpleRevenue(purchase, product) {
    const sale_price = toNumber(purchase.sale_price);
    const discount = toNumber(purchase.discount || 0);
    const quantity = toNumber(purchase.quantity);
    const totalPrice = sale_price * quantity;
    const revenue = totalPrice * (1 - discount / 100);
    return Math.round(revenue * 100) / 100;
}

// Основная функция анализа данных
function analyzeSalesData(data, options) {
    const { calculateRevenue, calculateBonus } = options;

    // Проверки данных
    if (!Array.isArray(data.sellers) || data.sellers.length === 0) throw new Error('Нет продавцов');
    if (!Array.isArray(data.purchase_records) || data.purchase_records.length === 0) throw new Error('Нет покупок');
    if (!Array.isArray(data.products) || data.products.length === 0) throw new Error('Нет продуктов');

    // Создаем карты для быстрого доступа
    const sellersMap = new Map();
    data.sellers.forEach(s => {
        sellersMap.set(s.id, {
            id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {},
        });
    });

    const productsMap = new Map();
    data.products.forEach(p => {
        productsMap.set(p.sku, p);
    });

    // Обработка покупок
    data.purchase_records.forEach(record => {
        const seller = sellersMap.get(record.seller_id);
        if (!seller) return;

        seller.sales_count += 1;

        // Обработка каждого товара в покупке
        record.items.forEach(item => {
            const product = productsMap.get(item.sku);
            if (!product) return;

            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;

            // Округляем значения для точности
            const roundedRevenue = Math.round(revenue * 100) / 100;
            const roundedProfit = Math.round(profit * 100) / 100;

            seller.revenue += roundedRevenue;
            seller.profit += roundedProfit;

            // Подсчет количества проданных товаров
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Сортировка продавцов по прибыли
    const sortedSellers = Array.from(sellersMap.values()).sort((a, b) => b.profit - a.profit);

    // Назначение бонусов и подготовка данных
    sortedSellers.forEach((seller, index) => {
        const bonusAmount = calculateBonus(index, sortedSellers.length, seller);
        // Округление бонуса и прибыли до 2 знаков
        seller.bonus = parseFloat(bonusAmount.toFixed(2));
        seller.profit = parseFloat(seller.profit.toFixed(2));
        // Также округлим revenue
        seller.revenue = parseFloat(seller.revenue.toFixed(2));
        // Создаем топ-10 продуктов
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Форматируем итоговые данные
    return sortedSellers.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2),
    }));
}