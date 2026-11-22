(() => {
  const byId = id => document.getElementById(id);

  function bindChoices(id, select) {
    const buttons = [...byId(id).querySelectorAll('button[data-key]')];
    const pick = button => {
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
      select(button.dataset.key);
    };
    for (const button of buttons) button.addEventListener('click', () => pick(button));
    pick(buttons[0]);
  }

  const drawings = {
    scheme: ['case/site-diagram.webp', 'Градиент от природы к индустриальному берегу',
      'На схеме природный участок выделен внутри промышленной набережной. Проследите переход от городской застройки к воде.'],
    axon: ['case/site-axon.webp', 'Аксонометрия территории и цеха',
      'Теперь найдите длинный цех. Его положение относительно причала и соседних зданий станет опорой для следующего вида.']
  };
  bindChoices('atlasTabs', key => {
    const [src, title, lead] = drawings[key];
    byId('atlasImage').src = src;
    byId('atlasImage').alt = title;
    byId('atlasZoom').dataset.image = src;
    byId('atlasZoom').dataset.caption = title + ' · DŌ buro';
    byId('readingLead').textContent = lead;
  });

  const detail = byId('galleryDetail');
  let entries = [], current = 0;
  function showMaterial(index) {
    current = index;
    const item = entries[index];
    const stage = byId('detailPair');
    stage.replaceChildren();
    stage.classList.toggle('solo', !item.before);
    if (item.before) stage.append(panel(item.before, 'Модель', item.title));
    stage.append(panel(item.after, item.kind || 'Проектный вид', item.title));
    byId('detailContext').textContent = item.group + '  /  ' + (index + 1) + ' из ' + entries.length;
    byId('detailTitle').textContent = item.title;
    byId('detailNote').textContent = item.anchor;
    byId('detailSource').textContent = item.source || '';
    byId('detailPrev').disabled = index === 0;
    byId('detailNext').disabled = index === entries.length - 1;
  }
  byId('detailPrev').onclick = () => showMaterial(current - 1);
  byId('detailNext').onclick = () => showMaterial(current + 1);
  for (const gallery of document.querySelectorAll('.gallery')) {
    const works = window.MURMANSK_INTERIORS.filter(item => item.group === gallery.dataset.group);
    for (const [index, item] of works.entries()) {
      const button = el('button', 'folioTile');
      button.type = 'button';
      button.setAttribute('aria-haspopup', 'dialog');
      const preview = el('span', 'folioPreview');
      const img = el('img');
      img.src = item.after;
      img.alt = '';
      if (['Аксонометрия','Схема','Разрез'].includes(item.kind)) preview.classList.add('drawingTile');
      preview.append(img);
      const caption = el('span', 'folioCaption');
      const type = item.before ? 'Модель + ' + (item.kind || 'визуализация').toLowerCase() : item.kind;
      caption.append(el('small', '', type), el('strong', '', item.title));
      button.append(preview, caption);
      button.onclick = () => {
        entries = works;
        showMaterial(index);
        detail.showModal();
      };
      gallery.append(button);
    }
  }

  const scenes = {
    hall: {
      src: 'interiors/north-hall.webp', alt: 'Павильон внутри старого цеха',
      source: 'Даниил Бубнов. Лекция № 2, с. 11. Фразы из промпта к интерьеру.',
      anchors: [
        [21,75,'Фудкорт','«ближе к камере находится зона фудкорта»','Положение задаёт расстояние до камеры. Найдите ближайшие столы у левого края павильона.'],
        [61,65,'Тёплый свет','«внутри новых конструкций горит свет»','Свет находится за оболочкой нового павильона. Сравните её с более тёмными стенами цеха.'],
        [67,43,'Переход','«мосты и переходы выполнены из стальных балок»','Переход проходит над общественным пространством. Его высоту и направление можно сверить с моделью.'],
        [42,18,'Старые фермы','«крыша из старых ферм»','Сохраните раскрытие старой кровли над новым объёмом. Проверьте, читаются ли фермы в следующем кадре.']
      ]
    },
    quay: {
      src: 'case/concept-a.webp', alt: 'Конкурсный вид длинного цеха у причала',
      source: 'DŌ buro. Учебная адаптация приёма для конкурсного вида территории.',
      anchors: [
        [45,38,'Фонарь','Продольный фонарь на кровле цеха','Назовите длинную полосу остекления. Она помогает узнать исходный корпус после правки материалов.'],
        [50,54,'Проход','Полоса между фасадом и водой','Укажите место светильников относительно фасада. На следующем кадре проверьте, свободен ли проход.'],
        [67,52,'Судно','Судно у причала справа от цеха','Положение судна относительно угла здания позволяет заметить сдвиг ракурса.'],
        [9,18,'Пути','Направление путей за участком','Сверьте направление параллельных линий. Это второй независимый ориентир за пределами здания.']
      ]
    }
  };
  bindChoices('anchorTabs', key => {
    const scene = scenes[key];
    const photo = byId('anchorPicture');
    photo.src = scene.src;
    photo.alt = scene.alt;
    const quay = key === 'quay';
    photo.width = quay ? 1444 : 1920;
    photo.height = quay ? 1284 : 1373;
    byId('anchorPhoto').classList.toggle('quay', quay);
    byId('anchorSource').textContent = scene.source;
    const pins = byId('anchorPins'), phrases = byId('anchorPhrases');
    pins.replaceChildren();
    phrases.replaceChildren();
    function highlight(index) {
      const [, , name, , description] = scene.anchors[index];
      byId('anchorName').textContent = name;
      byId('anchorMeaning').textContent = description;
      for (const parent of [pins,phrases]) {
        [...parent.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      }
    }
    scene.anchors.forEach(([x,y,name,quote], index) => {
      const pin = el('button','anchorPin');
      pin.style.left = x + '%';
      pin.style.top = y + '%';
      pin.textContent = index + 1;
      pin.setAttribute('aria-label', (index + 1) + '. ' + name);
      const hint = el('span','pinHint',name);
      hint.setAttribute('aria-hidden','true');
      pin.append(hint);
      const phrase = el('button','anchorPhrase');
      phrase.append(el('span','phraseNumber',String(index + 1)), el('span','',quote));
      for (const button of [pin,phrase]) {
        button.type = 'button';
        button.addEventListener('pointerenter', () => highlight(index));
        button.addEventListener('focus', () => highlight(index));
        button.addEventListener('click', () => highlight(index));
      }
      pins.append(pin);
      phrases.append(phrase);
    });
    highlight(0);
  });

  const prompts = {
    hall: [
      'На основе 3д модели из первого кадра выполни интерьер старого Цеха с новой постройкой общественного характера внутри. Ближе к камере находится зона фудкорта. Новая конструкция выполнена из прозрачного поликарбоната, внутри новых конструкций горит свет.',
      'Полностью сохрани геометрию здания и не меняй ракурс с уровня человеческого глаза.',
      'Лекция № 2, с. 11. Выдержки из одного запроса к визуализации цеха.'
    ],
    detail: [
      'Добавь источники света и ковры в зоне отдыха бара. Сделай фотореалистичный вид обновлённого интерьера.',
      'Сохрани лепнину, отделку пола и колонны. Не меняй пропорции помещения и предметов.',
      'Лекция № 2, с. 7. Сокращённая учебная версия задания по изменению стилистики.'
    ],
    quay: [
      'Вдоль фасада цеха добавь ряд низких светильников со стороны воды. Сохрани продольный фонарь на кровле.',
      'Не сдвигай линию причала и судно. Не меняй направление железнодорожных путей.',
      'Практика для Мурманска. Новый запрос по приёму пространственной привязки из лекции.'
    ]
  };
  const copy = byId('copyPrompt');
  let reset;
  bindChoices('promptTabs', key => {
    const [positive, negative, source] = prompts[key];
    byId('positiveText').textContent = positive;
    byId('negativeText').textContent = negative;
    byId('promptSource').textContent = source;
    clearTimeout(reset);
    copy.textContent = 'Скопировать обе части';
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(positive + '\n\n' + negative);
        copy.textContent = 'Скопировано';
        clearTimeout(reset);
        reset = setTimeout(() => {copy.textContent = 'Скопировать обе части';}, 1800);
      } catch {
        const range = document.createRange();
        range.setStartBefore(byId('positiveText'));
        range.setEndAfter(byId('negativeText'));
        getSelection().removeAllRanges();
        getSelection().addRange(range);
        copy.textContent = 'Текст выделен. Нажмите Ctrl+C';
      }
    };
  });
})();
