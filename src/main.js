// Функция расчёта выручки с учётом скидки
function calculateSimpleRevenue(purchase, _product) {
  const discountFactor = 1 - (purchase.discount / 100);
  const revenue = purchase.sale_price * purchase.quantity * discountFactor;
  return +revenue.toFixed(2); // Преобразуем в число
}

// Функция расчёта бонуса по позиции в рейтинге продавцов
function calculateBonusByProfit(index, total, seller) {
  const profit = seller.profit;
  if (index === 0) {
      return + (profit * 0.15).toFixed(2); // 15% для первого места
  } else if (index === 1 || index === 2) {
      return + (profit * 0.10).toFixed(2); // 10% для второго и третьего
  } else if (index === total - 1) {
      return 0; // 0% для последнего
  } else {
      return + (profit * 0.05).toFixed(2); // 5% для остальных
  }
}

// Главная функция анализа данных
function analyzeSalesData(data, options) {
    // Проверка входных данных
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
  
    // Проверка опций
    if (
      !options ||
      typeof options.calculateRevenue !== 'function' ||
      typeof options.calculateBonus !== 'function'
    ) {
      throw new Error('Отсутствуют необходимые функции в опциях');
    }
  
    const { calculateRevenue, calculateBonus } = options;
  
    // Создаем индексы для быстрого доступа
    const sellerIndex = {};
    data.sellers.forEach(seller => {
      sellerIndex[seller.id] = {
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
      };
    });
  
    const productIndex = {};
    data.products.forEach(product => {
      productIndex[product.sku] = product;
    });
  
    // Обработка чеков
    data.purchase_records.forEach(record => {
      const seller = sellerIndex[record.seller_id];
      if (!seller) return; // если продавец не найден, пропускаем
  
      // Увеличиваем счетчик продаж и сумму
      seller.sales_count += 1;
  
      // Обработка товаров в чеке
      record.items.forEach(item => {
        const product = productIndex[item.sku];
        if (!product) return;
  
        // Расчет стоимости товара (себестоимость)
        const cost = +(product.purchase_price * item.quantity).toFixed(2);
  
        // Расчет выручки по товару
        const revenue = +calculateRevenue(item, product).toFixed(2);
  
        // Расчет прибыли
        const profit = +(revenue - cost).toFixed(2);
  
        // Обновление суммы выручки и прибыли продавца
        seller.revenue = +(seller.revenue + revenue).toFixed(2);
        seller.profit = +(seller.profit + profit).toFixed(2);
  
        // Обновление количества проданных товаров
        if (!seller.products_sold[item.sku]) {
          seller.products_sold[item.sku] = 0;
        }
        seller.products_sold[item.sku] += item.quantity;
      });
    });
  
    // Создаем массив продавцов для сортировки
    const sellersArray = Object.values(sellerIndex);
  
    // Сортировка по прибыли, потом по выручке
    sellersArray.sort((a, b) => {
      if (b.profit !== a.profit) {
        return b.profit - a.profit;
      }
      return b.revenue - a.revenue;
    });
  
    const totalSellers = sellersArray.length;
  
    // Назначение бонусов и подготовка топ-10 товаров
    sellersArray.forEach((seller, index) => {
      // Расчет бонуса
      const bonusRaw = calculateBonus(index, totalSellers, seller);
      seller.bonus = +bonusRaw.toFixed(2);
  
      // Округление основных показателей
      seller.revenue = +seller.revenue.toFixed(2);
      seller.profit = +seller.profit.toFixed(2);
  
      // Формируем топ-10 товаров
      seller.top_products = Object.entries(seller.products_sold)
        .map(([sku, quantity]) => ({ sku, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    });
  
    sellersArray.forEach(seller => {
      seller.revenue = +seller.revenue.toFixed(2);
      seller.profit = +seller.profit.toFixed(2);
      seller.bonus = +seller.bonus.toFixed(2);
    });
  
    // Формируем итоговый массив с нужными полями
    return sellersArray.map(seller => ({
      seller_id: seller.id,
      name: seller.name,
      revenue: +seller.revenue.toFixed(2),
      profit: +seller.profit.toFixed(2),
      sales_count: seller.sales_count,
      top_products: seller.top_products,
      bonus: +seller.bonus.toFixed(2),
    }));
  }