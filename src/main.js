/**
 * Функция для расчета прибыли
 * @param sale_price
 * @param quantity
 * @param discount
 * @returns {number}
 */
function calculateSimpleRevenue(sale_price, quantity, discount) {
    const discountPercent = discount || 0;
    const discountFactor = discountPercent ? (1 - discountPercent / 100) : 1;
    return sale_price * quantity * discountFactor;
}

/**
 * Функция для определения процента бонуса по рангу продавца
 * @param index - позиция в отсортированном массиве (0-based)
 * @param total - всего продавцов
 * @param seller - объект продавца (может быть использован для дополнительных расчетов)
 * @returns {number} - процент бонуса
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return 15; // первое место — +15%
    if (index === 1 || index === 2) return 10; // второе и третье — +10%
    if (index === total -1) return 0; // последнее — +0%
    return 5; // остальные — +5%
}

/**
 * Основная функция анализа данных продаж
 */
function analyzeSalesData(data, options) {
    if (!data || typeof data !== 'object') {
        throw new Error('Данные не переданы или некорректны');
    }
    if (!Array.isArray(data.sellers)) {
        throw new Error('Отсутствует массив sellers');
    }
    if (!Array.isArray(data.purchase_records)) {
        throw new Error('Отсутствует массив purchase_records');
    }
    if (!Array.isArray(data.products)) {
        throw new Error('Отсутствует массив products');
    }

    const { calculateRevenue } = options || {};
    if (typeof calculateRevenue !== 'function') {
        throw new Error('Функция calculateRevenue должна быть передана в опциях');
    }

    // Инициализация статистики по продавцам
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: [seller.first_name, seller.last_name].filter(Boolean).join(' '),
        sales_count: 0,
        revenue: 0,
        profit: 0,
        products_sold: {}, // подсчет количества товаров по sku
        bonusPercent: 0,
        bonus: 0,
        top_products: []
    }));

    const sellerIndex = Object.fromEntries(
        sellerStats.map(s => [s.seller_id, s])
    );
    const productIndex = Object.fromEntries(
        data.products.map(p => [p.sku, p])
    );

    // Обработка чеков и товаров
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count +=1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const quantity = item.quantity;

            const cost = product.purchase_price * quantity;

            const salePrice = Number(item.sale_price);
            const qty = Number(quantity);
            const discountPercent = Number(item.discount || 0);

            if (isNaN(salePrice) || isNaN(qty) || isNaN(discountPercent)) {
                console.error('Некорректные данные товара:', { salePrice, qty, discountPercent });
                return;
            }

            // Расчет выручки с учетом скидки через функцию calculateRevenue
            const revenueItem = calculateRevenue(salePrice, qty, discountPercent);

            if (isNaN(revenueItem)) {
                console.error('calculateRevenue вернул NaN:', { salePrice, qty, discountPercent });
                return;
            }

            // Округляем выручку до двух знаков после запятой и добавляем к общему доходу продавца
            const roundedRevenue = Math.round(revenueItem * 100) / 100;
            seller.revenue += roundedRevenue;

            const profitItem = revenueItem - cost;

            if (isNaN(profitItem)) {
                console.error('Ошибка при расчетах прибыли:', { revenueItem, cost });
                return;
            }

            // Округляем прибыль до двух знаков и добавляем к общей прибыли продавца
            const roundedProfit = Math.round(profitItem * 100) / 100;
            seller.profit += roundedProfit;

            // Подсчет количества товаров по sku у продавца
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += quantity;
        });
    });

   // Сортируем продавцов по прибыли по убыванию
   sellerStats.sort((a,b) => b.profit - a.profit);

   const totalSellers = sellerStats.length;

   // Назначение бонусных процентов и расчет суммы бонуса в валюте
   sellerStats.forEach((seller, index) => {
       // Получаем процент бонуса по рангу
       const bonusPercent = calculateBonusByProfit(index, totalSellers, seller);
       seller.bonusPercent = bonusPercent; 

       // Расчет суммы бонуса как процента от прибыли
       seller.bonus = (seller.profit * bonusPercent) / 100;

       /**
        * Формируем топ-10 товаров по количеству проданных у каждого продавца.
        */
       const topProductsArr = Object.entries(seller.products_sold)
           .map(([sku, qty]) => ({ sku, quantity: qty }))
           .sort((a,b) => b.quantity - a.quantity)
           .slice(0,10);
       
       seller.top_products = topProductsArr;
   });

   // Формируем итоговый массив с нужными полями и округлениями
   return sellerStats.map(seller => ({
       seller_id: seller.seller_id,
       name: seller.name,
       revenue: +seller.revenue.toFixed(2),
       profit: +seller.profit.toFixed(2),
       sales_count: seller.sales_count,
       top_products: seller.top_products,
       bonus: +seller.bonus.toFixed(2),
   }));
}