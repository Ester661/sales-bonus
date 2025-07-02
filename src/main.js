function calculateSimpleRevenue(purchase, _product) {
    // purchase.sale_price — цена без скидки
    // purchase.discount — скидка в процентах
    const discountDecimal = purchase.discount / 100;
    const totalPrice = purchase.sale_price * purchase.quantity;
    const revenue = totalPrice * (1 - discountDecimal);
    return revenue;
}

function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
        return 15; // первое место
    } else if (index === 1 || index === 2) {
        return 10; // второе и третье место
    } else if (index === total - 1) {
        return 0; // последний
    } else {
        return 5; // остальные
    }
}

function analyzeSalesData(data, options) {
    const {
        calculateRevenue,
        calculateBonus
    } = options;

    // Проверка входных данных
    if (!data || typeof data !== 'object') return [];
    const {
        sellers,
        products,
        purchase_records
    } = data;

    if (!Array.isArray(sellers) || !Array.isArray(products) || !Array.isArray(purchase_records)) {
        return [];
    }

    const sellerMap = new Map();
    sellers.forEach(s => {
        sellerMap.set(s.id, s);
    });

    const productMap = new Map();
    products.forEach(p => {
        productMap.set(p.sku, p);
    });

    // Инициализация данных по продавцам
    const sellerStats = new Map();

    sellers.forEach(s => {
        sellerStats.set(s.id, {
            id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {} // для топ-10 товаров
        });
    });

    // Обработка записей о продажах
    purchase_records.forEach(record => {
        const sellerId = record.seller_id;
        const sellerData = sellerStats.get(sellerId);
        if (!sellerData) return; // пропускаем если продавец не найден

        let recordRevenue = 0;
        let recordProfit = 0;

        record.items.forEach(item => {
            const product = productMap.get(item.sku);
            if (!product) return;

            const revenuePart = calculateRevenue(item, product);
            recordRevenue += revenuePart;

            // Себестоимость товара
            const costPrice = product.purchase_price;
            // Прибыль от этого товара в этой продаже
            const profitPart = (revenuePart - costPrice * item.quantity);
            recordProfit += profitPart;

            if (!sellerData.products_sold[item.sku]) {
                sellerData.products_sold[item.sku] = 0;
            }
            sellerData.products_sold[item.sku] += item.quantity;
        });

        sellerData.revenue += recordRevenue;
        sellerData.profit += recordProfit;
        sellerData.sales_count += record.items.length; 

        sellerData.sales_count += 1;
        
        sellerData.sales_count += 1;
    });

    // Преобразуем в массив и сортируем по прибыли
    let sellersArray = Array.from(sellerStats.values());

    sellersArray.sort((a, b) => b.profit - a.profit);

    const totalSellers = sellersArray.length;

    sellersArray.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, totalSellers, seller);

        // Топ-10 товаров по количеству проданных штук
        const topProductsArr = Object.entries(seller.products_sold)
            .sort((a, b) => b[1] - a[1]) 
            .slice(0, 10)
            .map(([sku, quantity]) => ({
                sku,
                quantity
            }));

        seller.top_products = topProductsArr;

        delete seller.products_sold; 
    });

    return sellersArray;
}