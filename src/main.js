// Вспомогательные функции (оставляем без изменений)
function calculateSimpleRevenue(purchase, _product) {
    const discountFactor = 1 - (purchase.discount / 100);
    const revenue = purchase.sale_price * purchase.quantity * discountFactor;
    return +revenue.toFixed(2);
  }
  
  function calculateBonusByProfit(index, total, seller) {
    const profit = seller.profit;
    if (index === 0) {
        return + (profit * 0.15).toFixed(2);
    } else if (index === 1 || index === 2) {
        return + (profit * 0.10).toFixed(2);
    } else if (index === total - 1) {
        return 0;
    } else {
        return + (profit * 0.05).toFixed(2);
    }
  }
  
  // Основная функция
  function analyzeSalesData(data, options) {
    if (
      !data ||
      !Array.isArray(data.sellers) ||
      data.sellers.length === 0 ||
      !Array.isArray(data.products) ||
      data.products.length === 0 ||
      !Array.isArray(data.purchase_records) ||
      data.purchase_records.length === 0
    ) {
      throw new Error('Некорректные входные данные');
    }
  
    if (
      !options ||
      typeof options.calculateRevenue !== 'function' ||
      typeof options.calculateBonus !== 'function'
    ) {
      throw new Error('Отсутствуют необходимые функции в опциях');
    }
  
    const { calculateRevenue, calculateBonus } = options;
  
    // Шаг 3: подготовка промежуточных данных
    const sellerStats = data.sellers.map(seller => ({
      id: seller.id,
      name: `${seller.first_name} ${seller.last_name}`,
      revenue: 0,
      profit: 0,
      sales_count: 0,
      products_sold: {},
    }));
  
    const sellerIndex = {};
    sellerStats.forEach(seller => {
      sellerIndex[seller.id] = seller;
    });
  
    const productIndex = {};
    data.products.forEach(product => {
      productIndex[product.sku] = product;
    });
  
    // Обработка чеков (двойной цикл)
    data.purchase_records.forEach(record => {
      const seller = sellerIndex[record.seller_id];
      if (!seller) return;
  
      seller.sales_count += 1;
  
      record.items.forEach(item => {
        const product = productIndex[item.sku];
        if (!product) return;
  
        const cost = +(product.purchase_price * item.quantity).toFixed(2);
        const revenue = +calculateRevenue(item, product).toFixed(2);
        const profit = +(revenue - cost).toFixed(2);
  
        // Обновляем сумму по продавцу
        seller.revenue = +(seller.revenue + revenue).toFixed(2);
        seller.profit = +(seller.profit + profit).toFixed(2);
  
        // Обновляем количество проданных товаров
        if (!seller.products_sold[item.sku]) {
          seller.products_sold[item.sku] = 0;
        }
        seller.products_sold[item.sku] += item.quantity;
      });
    });
  
    // Сортировка по прибыли
    const sellersArray = Object.values(sellerIndex);
    sellersArray.sort((a, b) => {
      if (b.profit !== a.profit) {
        return b.profit - a.profit;
      }
      return b.revenue - a.revenue;
    });
  
    const totalSellers = sellersArray.length;
  
    // Назначение бонусов и формирование топ-10
    sellersArray.forEach((seller, index) => {
      const bonusRaw = calculateBonus(index, totalSellers, seller);
      seller.bonus = +bonusRaw.toFixed(2);
      seller.revenue = +seller.revenue.toFixed(2);
      seller.profit = +seller.profit.toFixed(2);
  
      seller.top_products = Object.entries(seller.products_sold)
        .map(([sku, quantity]) => ({ sku, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    });
  
    // Финальное округление
    sellersArray.forEach(seller => {
      seller.revenue = +seller.revenue.toFixed(2);
      seller.profit = +seller.profit.toFixed(2);
      seller.bonus = +seller.bonus.toFixed(2);
    });
  
    // Формируем итоговый массив
    return sellersArray.map(seller => ({
      seller_id: seller.id,
      name: seller.name,
      revenue: +seller.revenue.toFixed(2),
      profit: +seller.profit.toFixed(2),
      sales_count: seller.sales_count,
      top_products: seller.top_products.length,
      bonus: +seller.bonus.toFixed(2),
    }));
  }