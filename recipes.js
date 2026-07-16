
let resources = [];
let recipes = [];

async function loadJsonFile(filename) {
  const response = await fetch(filename);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${filename}: статус ${response.status}`);
  }
  return response.json(); // Можно сразу .json(), не нужно text() + parse
}

async function loadData() {
  try {
    // Параллельная загрузка
    const [resData, recData] = await Promise.all([
      loadJsonFile('resources.json'),
      loadJsonFile('recipes.json')
    ]);

    resources = Array.isArray(resData) ? resData : [];
    recipes = Array.isArray(recData) ? recData : [];

    console.log('[LOAD] Загружено ресурсов:', resources.length);
    console.log('[LOAD] Загружено рецептов:', recipes.length);

    // !!! ГЛАВНОЕ ИСПРАВЛЕНИЕ: Вызываем отрисовку ТОЛЬКО здесь, после загрузки данных
    initApp(); 

  } catch (err) {
    console.error('[LOAD] Ошибка:', err);
    const container = document.getElementById('recipes-container');
    if (container) {
      container.innerHTML = `<p style="color:#f00">Ошибка загрузки данных: ${err.message}. Проверьте консоль.</p>`;
    }
  }
}

function initApp() {
  // 1. Сначала строим базу предметов (теперь resources уже заполнен!)
  const itemsDB = resources.reduce((acc, item) => {
    const payload = item?.data;
    if (payload && typeof payload.id !== 'undefined') {
      acc[payload.id] = payload;
    }
    return acc;
  }, {});

  console.log('[DB] База предметов построена:', Object.keys(itemsDB).length);

  // 2. Запускаем отрисовку
  renderRecipes(itemsDB); // Передаём itemsDB внутрь функции, чтобы не зависеть от глобальной области
}

function formatQuantityRange(min, max) {
  if (min === undefined || max === undefined) return '?';
  const minR = Math.round(Number(min));
  const maxR = Math.round(Number(max));
  if (isNaN(minR) || isNaN(maxR)) return '?';
  return minR === maxR ? String(minR) : `${minR}–${maxR}`;
}

function getItemIcon(itemInfo) {
  if (itemInfo?.icon) return itemInfo.icon;
  return 'https://via.placeholder.com/24/333/fff?text=?';
}

// Изменили сигнатуру: теперь itemsDB передаётся аргументом
function renderRecipes(itemsDB) {
  const container = document.getElementById('recipes-container');
  if (!container) return; // Защита, если элемента нет на странице
  
  container.innerHTML = '';

  if (!Array.isArray(recipes) || recipes.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted)">Рецептов нет (массив пуст)</p>';
    return;
  }

  recipes.forEach((r, idx) => {
    if (!r || !r.recipe) {
      console.warn(`Рецепт #${idx} — нет объекта recipe`);
      return;
    }

    const matched = r.known_ingredients?.matched || [];
    
    const ingredientsHtml = matched.length
      ? matched.map(i => {
          const itemId = i?.item_id;
          if (typeof itemId === 'undefined') return '';

          const itemInfo = itemsDB[itemId]; // Теперь itemsDB точно содержит данные
          
          if (!itemInfo) {
            console.warn(`ID ${itemId} не найден в базе предметов`);
            // Можно вернуть заглушку или пропустить
            return `<div class="ingredient-item" style="color:#888">ID ${itemId} (не найден)</div>`;
          }

          const name = itemInfo.name;
          const iconUrl = getItemIcon(itemInfo);
          const qty = Math.round(i.quantity);

          return `
            <div class="ingredient-item">
              <img src="${iconUrl}" alt="${name}" class="ingredient-icon" loading="lazy">
              <span class="ingredient-name">${name}</span>
              <span class="ingredient-qty">×${qty}</span>
            </div>`;
        }).join('')
      : '<div class="ingredient-item" style="color:var(--text-muted)">Ингредиенты не указаны</div>';

    const resultQty = formatQuantityRange(
      r.recipe.result_quantity_min,
      r.recipe.result_quantity
    );

    const resultItem = itemsDB[r.recipe.result_item_id];
    const resultName = resultItem?.name || `ID ${r.recipe.result_item_id}`;
    const resultIconUrl = getItemIcon(resultItem);

    const card = document.createElement('div');
    card.className = 'recipe-card';

    card.innerHTML = `
      <div class="recipe-header">
        <div>
          <strong>Рецепт #${r.recipe_id}</strong>
          <div class="recipe-id-info">Шанс: ${r.recipe.success_chance}% | Редкость: ${r.recipe.rarity}</div>
        </div>
        <button type="button" class="toggle-btn">▼</button>
      </div>
      <div class="ingredients-list">
        ${ingredientsHtml}
      </div>
      <div class="result-block">
        <img src="${resultIconUrl}" alt="${resultName}" class="result-icon" loading="lazy">
        <span class="result-text">${resultName}, ${resultQty} шт.</span>
      </div>`;

    const toggleBtn = card.querySelector('.toggle-btn');
    const list = card.querySelector('.ingredients-list');

    toggleBtn.addEventListener('click', () => {
      list.classList.toggle('open');
      toggleBtn.textContent = list.classList.contains('open') ? '▲' : '▼';
    });

    container.appendChild(card);
  });
}

// --- Мобильное меню (оставляем как было) ---
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggleBtn');
  const dropdownMenu = document.getElementById('dropdownMenu');

  if (menuToggle && dropdownMenu) {
    menuToggle.addEventListener('click', () => dropdownMenu.classList.toggle('active'));
    document.addEventListener('click', (e) => {
      if (!dropdownMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        dropdownMenu.classList.remove('active');
      }
    });
  }
});

// --- ЗАПУСК ---
// Запускаем загрузку данных сразу при готовности DOM
document.addEventListener('DOMContentLoaded', () => {
  loadData();
});