const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz6dtYiRma3v0b-8-QX3_7ucNLtwm96stzOEICwU7fOh0pVk5gsKVQ6jbpKG3yndMvK/exec"; 
const SECURITY_TOKEN = "MySuperSecretToken2026";

// 1. Гибридный парсинг параметров из URL (для поддержки индивидуальных ссылок)
const urlParams = new URLSearchParams(window.location.search);
const userFio = urlParams.get('fio') || "";
const fioInput = document.getElementById('fio');

if (userFio) {
    fioInput.value = userFio;
    fioInput.readOnly = true; // Если ФИО передано в ссылке — запрещаем редактирование
}

// Умная генерация инициалов «на лету» при ручном вводе ФИО сотрудником
fioInput.addEventListener('input', function() {
    const words = this.value.trim().split(/\s+/);
    if (words.length >= 2) {
        let lastName = words[0];
        let firstNameLetter = words[1].charAt(0).toUpperCase();
        let middleNameLetter = words[2] ? words[2].charAt(0).toUpperCase() + "." : "";
        document.getElementById('initials').value = `${lastName} ${firstNameLetter}.${middleNameLetter}`;
    }
});

// 2. Получение красивого HTML-текста и маскировка тегов
window.onload = function() {
    fetch(WEB_APP_URL)
        .then(response => response.json())
        .then(data => {
            if (data.html) {
                let cleanHtml = data.html;
                
                // Визуальная замена серверных тегов для пользователя
                cleanHtml = cleanHtml.replace(/{{ДАТА_ЗАПОЛНЕНИЯ}}/g, '<b style="color:#3182ce;">[Текущая дата]</b>');
                cleanHtml = cleanHtml.replace(/{{ФИО}}/g, '<b style="color:#3182ce;">[Ваше ФИО]</b>');
                cleanHtml = cleanHtml.replace(/{{ДАТА_РОЖДЕНИЯ}}/g, '<b style="color:#3182ce;">[Дата рождения]</b>');
                cleanHtml = cleanHtml.replace(/{{КОМПАНИЯ}}/g, '<b>ИП «ЧАГАЕВ Х.-М.»</b>');
                cleanHtml = cleanHtml.replace(/{{ДОЛЖНОСТЬ}}/g, '<b style="color:#3182ce;">[Ваша должность]</b>');
                cleanHtml = cleanHtml.replace(/{{ДАТА_НАЧАЛА}}/g, '<b style="color:#3182ce;">[Дата начала]</b>');
                cleanHtml = cleanHtml.replace(/{{ЗАРПЛАТА}}/g, '<b style="color:#3182ce;">[Размер зарплаты]</b>');
                cleanHtml = cleanHtml.replace(/{{ИНИЦИАЛЫ}}/g, '<b style="color:#3182ce;">[Ваши инициалы]</b>');
                cleanHtml = cleanHtml.replace(/{{ПОДПИСЬ}}/g, ''); // Скрываем технический маркер подписи
                
                document.getElementById('text-box').innerHTML = cleanHtml;
            } else {
                document.getElementById('text-box').innerText = "Ошибка загрузки документа.";
            }
        })
        .catch(err => {
            document.getElementById('text-box').innerText = "Сервер недоступен.";
        });
};

// 3. Контроль прочтения: разблокировка кнопки строго внизу скролл-бокса
const textBox = document.getElementById('text-box');
const nextBtn = document.getElementById('next-btn');

textBox.onscroll = function() {
    if (textBox.scrollHeight - textBox.scrollTop <= textBox.clientHeight + 10) {
        nextBtn.disabled = false;
    }
};

nextBtn.onclick = function() {
    document.getElementById('step-1').style.display = 'none';
    document.getElementById('step-2').style.display = 'block';
};

// 4. Логика тач-событий рисования Canvas подписи
const canvas = document.getElementById('sig-canvas');
const ctx = canvas.getContext('2d');
ctx.strokeStyle = "#000000";
ctx.lineWidth = 3;

let drawing = false;

function getMousePos(canvasDom, touchOrMouseEvent) {
    let rect = canvasDom.getBoundingClientRect();
    if (touchOrMouseEvent.touches && touchOrMouseEvent.touches.length > 0) {
        return {
            x: touchOrMouseEvent.touches[0].clientX - rect.left,
            y: touchOrMouseEvent.touches[0].clientY - rect.top
        };
    }
    return {
        x: touchOrMouseEvent.clientX - rect.left,
        y: touchOrMouseEvent.clientY - rect.top
    };
}

canvas.addEventListener("mousedown", (e) => { drawing = true; let pos = getMousePos(canvas, e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); });
canvas.addEventListener("mouseup", () => { drawing = false; });
canvas.addEventListener("mousemove", (e) => { if (!drawing) return; let pos = getMousePos(canvas, e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); });

canvas.addEventListener("touchstart", (e) => { drawing = true; let pos = getMousePos(canvas, e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); e.preventDefault(); });
canvas.addEventListener("touchend", (e) => { drawing = false; e.preventDefault(); });
canvas.addEventListener("touchmove", (e) => { if (!drawing) return; let pos = getMousePos(canvas, e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); e.preventDefault(); });

document.getElementById('clear-btn').onclick = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// 5. POST отправка пакета данных на Google Apps Script веб-хук
document.getElementById('edo-form').onsubmit = function(e) {
    e.preventDefault();
    
    // Проверка на пустую подпись
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
        alert("Пожалуйста, поставьте вашу подпись.");
        return;
    }

    document.getElementById('submit-btn').disabled = true;
    document.getElementById('submit-btn').innerText = "Отправка...";

    const payload = {
        token: SECURITY_TOKEN,
        fio: document.getElementById('fio').value.trim(),
        birthDate: document.getElementById('birthDate').value,
        company: document.getElementById('company').value,
        jobTitle: document.getElementById('jobTitle').value,
        startDate: document.getElementById('startDate').value,
        salary: document.getElementById('salary').value,
        initials: document.getElementById('initials').value,
        signature: canvas.toDataURL("image/png") // Конвертация изображения в Base64 строку
    };

    fetch(WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    })
    .then(res => res.text())
    .then(text => {
        if (text === "Success") {
            document.getElementById('step-2').style.display = 'none';
            document.getElementById('step-3').style.display = 'block';
        } else {
            alert("Ошибка сервера: " + text);
            document.getElementById('submit-btn').disabled = false;
            document.getElementById('submit-btn').innerText = "Подписать и отправить";
        }
    })
    .catch(err => {
        alert("Ошибка сети. Попробуйте позже.");
        document.getElementById('submit-btn').disabled = false;
    });
};
