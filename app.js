let wordList = [];
let currentIndex = 0;
let masteredWords = [];
let studentName = "";
let currentUnitName = "";

window.onload = async function() {
    // 1. 名前確認
    studentName = localStorage.getItem('studentName');
    if (!studentName || studentName === "null") {
        studentName = prompt("名前を漢字で入力してください");
        if (studentName) localStorage.setItem('studentName', studentName);
        else studentName = "匿名希望";
    }
    document.getElementById('display-name').innerText = studentName;

    // 2. Unitリスト作成
    const listDiv = document.getElementById('unit-list');
    if (typeof allUnits !== 'undefined') {
        Object.keys(allUnits).forEach(unit => {
            const btn = document.createElement('button');
            btn.innerText = unit;
            btn.onclick = () => startLearning(unit);
            listDiv.appendChild(btn);
        });
    }
};

// 学習開始
async function startLearning(unit) {
    currentUnitName = unit;
    
    // Firebaseから進捗取得
    try {
        const docRef = window.fs.doc(window.db, "progress", studentName, "units", unit);
        const docSnap = await window.fs.getDoc(docRef);
        masteredWords = (docSnap.exists()) ? (docSnap.data().masteredWords || []) : [];
    } catch (e) { masteredWords = []; }

    wordList = allUnits[unit];
    currentIndex = 0;

    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('learning-screen').classList.add('active');
    showCard();
}

// カード表示
function showCard() {
    const data = wordList[currentIndex];
    const card = document.getElementById('card');
    card.classList.remove('is-flipped');

    // 表面
    document.getElementById("word-display").innerText = data.Word;
    document.getElementById("pos-display").innerText = data["品詞"] || "";
    document.getElementById("phonetic-display").innerText = data["発音記号"] || "";
    const isMastered = masteredWords.includes(data.Word);
    document.getElementById("complete-badge").style.display = isMastered ? "block" : "none";

    // 裏面の内容を構築
    const meanings = [data["意味1"], data["意味2"], data["意味3"]].filter(m => m && m.trim() !== "").join(" / ");
    
    let html = `
        <div style="padding: 20px; text-align: center;">
            <h2 style="color: #007bff; margin-bottom: 10px;">${meanings}</h2>
            <div style="text-align: left; font-size: 0.9em; border-top: 1px solid #eee; margin-top: 15px; padding-top: 10px;">
    `;
    
    if (data["別の品詞"]) {
        html += `<div style="background:#f8f9fa; padding:5px; margin-bottom:10px;"><strong>【別の品詞】</strong><br>${data["別の品詞"]}: ${data["意味"] || ""}</div>`;
    }
    if (data["派生語1"]) {
        html += `<div style="margin-bottom:8px;"><strong>【派生語1】</strong><br>${data["派生語1"]} [${data["品詞1"] || ""}]<br>${data["意味1.1"] || ""}</div>`;
    }
    if (data["派生語2"]) {
        html += `<div><strong>【派生語2】</strong><br>${data["派生語2"]} [${data["品詞2"] || ""}]<br>${data["意味2.1"] || ""}</div>`;
    }

    html += `
            </div>
            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                <label style="font-size: 1.3em; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <input type="checkbox" id="master-check" style="width: 22px; height: 22px;" 
                    ${isMastered ? 'checked' : ''} onchange="toggleMastered(event, '${data.Word}')">
                    <span>覚えた！</span>
                </label>
            </div>
        </div>
    `;

    document.getElementById("card-back-contents").innerHTML = html;
    updateProgressUI();
}

// 習得状態の切り替え
async function toggleMastered(event, word) {
    event.stopPropagation(); // カードが回転するのを防ぐ
    if (event.target.checked) {
        if (!masteredWords.includes(word)) masteredWords.push(word);
    } else {
        masteredWords = masteredWords.filter(w => w !== word);
    }
    document.getElementById("complete-badge").style.display = event.target.checked ? "block" : "none";

    const docRef = window.fs.doc(window.db, "progress", studentName, "units", currentUnitName);
    await window.fs.setDoc(docRef, { masteredWords: masteredWords }, { merge: true });
}

function updateProgressUI() {
    const total = wordList.length;
    document.getElementById('progress-text').innerText = `${currentIndex + 1} / ${total}`;
    document.getElementById('progress-bar').style.width = `${((currentIndex + 1) / total) * 100}%`;
}

window.nextCard = function() {
    if (currentIndex < wordList.length - 1) {
        currentIndex++;
        showCard();
    } else {
        alert("Unitの終了です！");
        location.reload();
    }
};

window.prevCard = function() {
    if (currentIndex > 0) {
        currentIndex--;
        showCard();
    }
};

// 音声再生
window.playAudio = function(event) {
    if (event) event.stopPropagation();
    const word = document.getElementById('word-display').innerText;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(word);
    msg.lang = 'en-US';
    msg.rate = 0.9;
    window.speechSynthesis.speak(msg);
};