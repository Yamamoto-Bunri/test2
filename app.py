let wordList = [];
let currentIndex = 0;
let masteredWords = [];
let studentName = "";
let currentUnitName = "";

// ページ読み込み時
window.onload = async function() {
    studentName = localStorage.getItem('studentName');
    if (!studentName || studentName === "null") {
        studentName = prompt("名前を漢字で入力してください");
        if (studentName) localStorage.setItem('studentName', studentName);
    }
    document.getElementById('display-name').innerText = studentName || "未設定";

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
    
    // FirebaseからこのUnitの習得状況を読み込み
    try {
        const docRef = window.fs.doc(window.db, "progress", studentName, "units", unit);
        const docSnap = await window.fs.getDoc(docRef);
        masteredWords = docSnap.exists() ? (docSnap.data().masteredWords || []) : [];
    } catch (e) {
        console.error("Firebase読み込みエラー", e);
        masteredWords = [];
    }

    wordList = allUnits[unit];
    currentIndex = 0;

    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('learning-screen').classList.add('active');
    showCard();
}

// カード表示更新
function showCard() {
    const data = wordList[currentIndex];
    const isMastered = masteredWords.includes(data.Word);

    // 表面
    document.getElementById("word-display").innerText = data.Word;
    document.getElementById("pos-display").innerText = data["品詞"] || "";
    document.getElementById("phonetic-display").innerText = data["発音記号"] || "";
    document.getElementById("complete-badge").style.display = isMastered ? "block" : "none";
    
    // カードを表面に戻す
    document.getElementById('card').classList.remove('is-flipped');

    // 裏面の内容構築
    const meanings = [data["意味1"], data["意味2"], data["意味3"]].filter(m => m && m.trim() !== "").join(" / ");
    
    let backHtml = `
        <div style="padding: 20px; text-align: center;">
            <h2 style="color: #007bff; margin-bottom: 10px;">${meanings}</h2>
            <div style="text-align: left; font-size: 0.9em; border-top: 1px solid #eee; margin-top: 15px; padding-top: 10px;">
    `;

    if (data["別の品詞"]) {
        backHtml += `<div style="background:#f8f9fa; padding:8px; margin-bottom:10px;"><strong>【別の品詞】</strong><br>${data["別の品詞"]}: ${data["意味"] || ""}</div>`;
    }
    if (data["派生語1"]) {
        backHtml += `<div style="margin-bottom:8px;"><strong>【派生語1】</strong><br>${data["派生語1"]} [${data["品詞1"] || ""}]<br>${data["意味1.1"] || ""}</div>`;
    }
    if (data["派生語2"]) {
        backHtml += `<div><strong>【派生語2】</strong><br>${data["派生語2"]} [${data["品詞2"] || ""}]<br>${data["意味2.1"] || ""}</div>`;
    }

    backHtml += `
            </div>
            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                <label style="font-size: 1.3em; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <input type="checkbox" id="master-check" style="width: 20px; height: 20px;" 
                    ${isMastered ? 'checked' : ''} onchange="toggleMastered(event, '${data.Word}')">
                    <span>覚えた！</span>
                </label>
            </div>
        </div>
    `;

    document.getElementById("card-back-contents").innerHTML = backHtml;
    updateProgressUI();
}

// 習得状況保存
async function toggleMastered(event, word) {
    event.stopPropagation(); // カードが回転するのを防ぐ
    
    if (event.target.checked) {
        if (!masteredWords.includes(word)) masteredWords.push(word);
    } else {
        masteredWords = masteredWords.filter(w => w !== word);
    }

    document.getElementById("complete-badge").style.display = event.target.checked ? "block" : "none";

    const docRef = window.fs.doc(window.db, "progress", studentName, "units", currentUnitName);
    try {
        await window.fs.setDoc(docRef, { masteredWords: masteredWords }, { merge: true });
    } catch (e) { console.error("保存失敗", e); }
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
        alert("Unit終了です！");
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
    if (!word) return;

    window.speechSynthesis.cancel();

    // ダミー：音声エンジンを起動させるための「助走」
    const dummy = new SpeechSynthesisUtterance(" ");
    dummy.volume = 0;
    dummy.rate = 1.0; // 速すぎると onend が発火しないブラウザがある

    // ★ ダミーが完全に終わってから本番を発話
    dummy.onend = function() {
        const real = new SpeechSynthesisUtterance(word);
        real.lang = 'en-US';
        real.volume = 1.0;
        real.rate = 0.9;
        window.speechSynthesis.speak(real);
    };

    window.speechSynthesis.speak(dummy);
};