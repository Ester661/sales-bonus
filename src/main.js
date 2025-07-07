// Функция расчёта выручки с учётом скидки
function calculateSimpleRevenue(purchase, _product) {
  const discountFactor = 1 - (purchase.discount / 100);  
  const revenue = purchase.sale_price * purchase.quantity * discountFactor;  
  return +revenue; // Преобразуем в число  
  }
  
    
  // Функция расчёта бонуса по позиции в рейтинге продавцов  
  function calculateBonusByProfit(index, total, seller) {  
  const profit = seller.profit; 
  if (index === 0) {  
  return + (profit * 0.15); // 15% для первого места  
  } else if (index === 1 || index === 2) {  
  return + (profit * 0.10); // 10% для второго и третьего  
  } else if (index === total - 1) {  
  return 0; // 0% для последнего  
  } else {  
  return + (profit * 0.05); // 5% для остальных 
  } 
  }

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

  // Индексы продавцов и товаров
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
    if (!seller) return;

    // Увеличиваем счётчик продаж
    seller.sales_count += 1;

    seller.revenue += record.total_amount;

    // Обработка товаров в чеке
    record.items.forEach(item => {
      const product = productIndex[item.sku];
      if (!product) return;

      const cost = +(product.purchase_price * item.quantity);
      const revenue = +calculateRevenue(item, product);
      const profit = +(revenue - cost);

      // Обновляем только прибыль
      seller.profit += profit;

      // Учёт проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // Формируем массив продавцов и сортируем
  const sellersArray = Object.values(sellerIndex);
  sellersArray.sort((a, b) => {
    if (b.profit !== a.profit) return b.profit - a.profit;
    return b.revenue - a.revenue;
  });

  const totalSellers = sellersArray.length;

  // Назначение бонусов и формирование топ-10 товаров
  sellersArray.forEach((seller, index) => {
    seller.bonus = +calculateBonus(index, totalSellers, seller);
    seller.revenue = +seller.revenue;
    seller.profit = +seller.profit;

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // Финальный массив
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