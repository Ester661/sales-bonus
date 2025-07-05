// 1. Методика расчёта бонуса по позиции в рейтинге
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
        // Первый — самый прибыльный
        return 15;
    } else if (index === 1 || index === 2) {
        // Второе и третье место
        return 10;
    } else if (index === total - 1) {
        // Последнее место
        return 0;
    } else {
        // Остальные
        return 5;
    }
}

// 2. Расчет выручки с учетом скидки
function calculateSimpleRevenue(purchase, _product) {
    const { discount = 0, sale_price, quantity } = purchase;
    const discountDecimal = discount / 100;
    const totalPrice = sale_price * quantity;
    const revenue = totalPrice * (1 - discountDecimal);
    return +revenue.toFixed(2);
}

// 3. Основная функция анализа
function analyzeSalesData(data, options) {
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        data.sellers.length === 0 ||
        !Array.isArray(data.purchase_records) ||
        data.purchase_records.length === 0 ||
        !Array.isArray(data.products) ||
        data.products.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }
    if (!options || typeof options !== 'object') {
        throw new Error('Опции должны быть объектом');
    }
    const { calculateRevenue, calculateBonus } = options;
    if (
        typeof calculateRevenue !== 'function' ||
        typeof calculateBonus !== 'function'
    ) {
        throw new Error('Не переданы функции расчёта');
    }

    // Создаем промежуточные структуры
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        bonusPercent: 0,
        bonus: 0,
        top_products: []
    }));

    const sellerIndex = Object.fromEntries(
        sellerStats.map(s => [s.id, s])
    );
    const productIndex = Object.fromEntries(
        data.products.map(p => [p.sku, p])
    );

    // Обработка продаж
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) {
            // пропускаем, если продавец не найден
            return;
        }
        seller.sales_count += 1;

        // Обработка товаров в чеке
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) {
                console.warn('Товар не найден:', item.sku);
                return;
            }
            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;

            seller.revenue += revenue;
            seller.profit += profit;

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортируем продавцов по прибыли
    const sortedSellers = [...sellerStats].sort((a, b) => b.profit - a.profit);

    // Назначение бонусов по рангу
    sortedSellers.forEach((seller, index) => {
        const bonusPercent = calculateBonus(index, sortedSellers.length, seller);
        seller.bonusPercent = bonusPercent;
        // Округление прибыли
        seller.profit = +seller.profit.toFixed(2);
        // Расчет бонуса
        seller.bonus = +((seller.profit * bonusPercent) / 100).toFixed(2);
        // Формируем топ-10 товаров
        const topProductsArray = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        seller.top_products = topProductsArray;
    });

    // Итоговая подготовка
    return sortedSellers.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}