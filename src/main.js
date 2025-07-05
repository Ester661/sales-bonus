// Функция расчёта выручки с учётом скидки
function calculateSimpleRevenue(purchase, _product) {
    // purchase — один из элементов purchase_records[].items
    // _product — объект товара из data.products (не используется здесь, но может пригодиться)
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
      !Array.isArray(data.sellers) || data.sellers.length === 0 ||
      !Array.isArray(data.products) || data.products.length === 0 ||
      !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
      throw new Error('Некорректные входные данные');
    }
  
    // Проверка опций и функций
    if (
      !options ||
      typeof options.calculateRevenue !== 'function' ||
      typeof options.calculateBonus !== 'function'
    ) {
      throw new Error('Отсутствуют необходимые функции в опциях');
    }
  
    const { calculateRevenue, calculateBonus } = options;
  
    // Подготовка промежуточных данных — статистика по продавцам
    const sellerStats = data.sellers.map(seller => ({
      id: seller.id,
      name: `${seller.first_name} ${seller.last_name}`,
      revenue: 0,
      profit: 0,
      sales_count: 0,
      products_sold: {}, // { sku: quantity }
    }));
  
    // Индексация продавцов и продуктов для быстрого доступа
    const sellerIndex = {};
    sellerStats.forEach(seller => {
      sellerIndex[seller.id] = seller;
    });
  
    const productIndex = {};
    data.products.forEach(product => {
      productIndex[product.sku] = product;
    });
  
    // Обработка всех чеков и товаров в них
    data.purchase_records.forEach(record => {
      const seller = sellerIndex[record.seller_id];
      if (!seller) return; // Если продавец не найден, пропускаем
  
      // Увеличиваем количество продаж (число чеков)
      seller.sales_count += 1;
  
      // Увеличиваем выручку на сумму чека с учётом скидок по товарам (через функцию)
      // Важно: total_amount в данных — без учёта скидок, поэтому считаем сами
      // Но для надёжности считаем по каждому товару отдельно
  
      record.items.forEach(item => {
        const product = productIndex[item.sku];
        if (!product) return;
  
        // Себестоимость товара
        const cost = product.purchase_price * item.quantity;
  
        // Выручка с учётом скидки
        const revenue = calculateRevenue(item, product);
  
        // Прибыль
        const profit = revenue - cost;
  
        // Накопление статистики
        seller.revenue += revenue;
        seller.profit += profit;
  
        // Увеличиваем количество проданных товаров
        if (!seller.products_sold[item.sku]) {
          seller.products_sold[item.sku] = 0;
        }
        seller.products_sold[item.sku] += item.quantity;
      });
    });
  
    // Сортируем продавцов по убыванию прибыли, при равенстве — по убыванию выручки
    sellerStats.sort((a, b) => {
      if (b.profit !== a.profit) return b.profit - a.profit;
      return b.revenue - a.revenue;
    });
  
    // Назначаем бонусы и формируем топ-10 товаров
    sellerStats.forEach((seller, index) => {
      // Рассчитываем бонус
      const bonusRaw = calculateBonus(index, sellerStats.length, seller);
      seller.bonus = +bonusRaw.toFixed(2);
  
      // Округляем выручку и прибыль
      seller.revenue = +seller.revenue.toFixed(2);
      seller.profit = +seller.profit.toFixed(2);
  
      // Формируем топ-10 товаров
      seller.top_products = Object.entries(seller.products_sold)
        .map(([sku, quantity]) => ({ sku, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    });
  
    // Формируем итоговый отчет
    return sellerStats.map(seller => ({
      seller_id: seller.id,
      name: seller.name,
      revenue: seller.revenue,
      profit: seller.profit,
      sales_count: seller.sales_count,
      top_products: seller.top_products,
      bonus: seller.bonus,
    }));
  }