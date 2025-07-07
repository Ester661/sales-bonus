// Функция расчёта выручки с учётом скидки
function calculateSimpleRevenue(purchase, _product) {
  const discountFactor = 1 - (purchase.discount / 100);
  const revenue = purchase.sale_price * purchase.quantity * discountFactor;
  return revenue;
}

// Функция расчёта бонуса по позиции в рейтинге продавцов
function calculateBonusByProfit(index, total, seller) {
  const profit = seller.profit;
  if (index === 0) {
    return profit * 0.15; // 15% для первого места
  } else if (index === 1 || index === 2) {
    return profit * 0.10; // 10% для второго и третьего
  } else if (index === total - 1) {
    return 0; // 0% для последнего
  } else {
    return profit * 0.05; // 5% для остальных
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

    // Увеличиваем счетчик продаж и сумму выручки по чеку
    seller.sales_count += 1;
    seller.revenue += record.total_amount; // Обновлено здесь

    // Обработка товаров в чеке для расчета прибыли и проданных товаров
    record.items.forEach(item => {
      const product = productIndex[item.sku];
      if (!product) return;

      // Расчет стоимости товара (себестоимость)
      const cost = product.purchase_price * item.quantity;

      // Расчет выручки по товару (используется для прибыли)
      const itemRevenue = calculateRevenue(item, product);

      // Расчет прибыли
      const profit = itemRevenue - cost;

      // Обновление суммы прибыли продавца
      seller.profit += profit;

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
    seller.bonus = calculateBonus(index, totalSellers, seller);

    // Формируем топ-10 товаров
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // Формируем итоговый массив с нужными полями и применяем toFixed(2)
  return sellersArray.map(seller => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: seller.revenue.toFixed(2), // Применяем toFixed(2) здесь
    profit: seller.profit.toFixed(2),   // Применяем toFixed(2) здесь
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: seller.bonus.toFixed(2),     // Применяем toFixed(2) здесь
  }));
}