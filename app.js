let wordList = [];
let currentIndex = 0;
let masteredWords = [];
let studentName = "";
let playOrder = 'order'; 
let filterMode = 'all';

window.onload = async function() {
    // 1. 名前確認
    studentName = localStorage.getItem('studentName');
    if (!studentName || studentName === "null") {
        studentName = prompt("【進捗保存用】フルネームを漢字で入力してください。");
        if (studentName) localStorage.setItem('studentName', studentName);
        else studentName = "匿名希望";
    }
    document.getElementById('display-name').innerText = studentName;

    // 2. Firebaseから進捗を読み込む（正常コードのロジック）
    try {
        const docRef = window.fs.doc(window.db, "progress", studentName);
        const docSnap = await window.fs.getDoc(docRef);
        if (docSnap.exists()) {
            masteredWords = docSnap.data().words || [];
        }
    } catch (e) { console.error("読み込みエラー:", e); }

    // 3. Unitリストの生成
    const listDiv = document.getElementById('unit-list');
    if (typeof allUnits !== 'undefined') {
        Object.keys(allUnits).forEach(unitName => {
            const btn = document.createElement('button');
            btn.innerText = unitName;
            btn.onclick = () => startLearning(unitName);
            listDiv.appendChild(btn);
        });
    }

    // 4. カードの回転イベント（正常コードの classList.toggle('is-flipped') を維持）
    const card = document.getElementById('card');
    card.onclick = function() {
        this.classList.toggle('is-flipped');
    };
};

// モード選択（ボタンの見た目と変数を更新）
window.setOrder = function(mode) {
    playOrder = mode;
    document.getElementById('btn-order').classList.toggle('selected', mode === 'order');
    document.getElementById('btn-random').classList.toggle('selected', mode === 'random');
};
window.setFilter = function(mode) {
    filterMode = mode;
    document.getElementById('btn-all').classList.toggle('selected', mode === 'all');
    document.getElementById('btn-unmastered').classList.toggle('selected', mode === 'unmastered');
};

// 学習開始
function startLearning(unitName) {
    let rawList = [...allUnits[unitName]];

    // 未習得のみフィルター
    if (filterMode === 'unmastered') {
        rawList = rawList.filter(item => !masteredWords.includes(item.Word));
    }

    if (rawList.length === 0) {
        alert("学習対象の単語がすべて習得済み、またはデータがありません。");
        return;
    }

    // シャッフル
    if (playOrder === 'random') {
        rawList.sort(() => Math.random() - 0.5);
    }

    wordList = rawList;
    currentIndex = 0;

    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('learning-screen').classList.add('active');
    displayCard();
}

// 画面更新（元の正常コードの書き換えロジックを完全復元）
function displayCard() {
    const data = wordList[currentIndex];
    const isMastered = masteredWords.includes(data["Word"]);

    // 基本情報の書き換え
    document.getElementById("word-display").innerText = data["Word"];
    document.getElementById("pos-display").innerText = data["品詞"] || "";
    document.getElementById("phonetic-display").innerText = data["発音記号"] || "";
    
    const meanings = [data["意味1"], data["意味2"], data["意味3"]]
        .filter(m => m && m.trim() !== "").join(" / ");
    document.getElementById("meanings-display").innerText = meanings;

    // 覚えた！状態の反映
    document.getElementById("mastered-checkbox").checked = isMastered;
    document.getElementById("complete-badge").style.display = isMastered ? "block" : "none";

    // 派生語エリアの制御（正常コードのロジック）
    const dDisplay = document.getElementById('derived-display');
    const dButton = document.getElementById('show-derived');
    dDisplay.style.display = 'none';

    const hasDerived = (data["別の品詞"] && data["別の品詞"].trim() !== "") || 
                        (data["派生語1"] && data["派生語1"].trim() !== "");

    if (hasDerived) {
        dButton.style.display = "block";
        let otherPosHtml = data["別の品詞"] ? `
            <div style="background: #f8f9fa; padding: 8px; border-radius: 5px; margin-bottom: 10px; margin-top:10px;">
                <strong style="color: #2c3e50;">【別の品詞】</strong><br>
                ${data["別の品詞"]} : ${data["意味"] || ""}
            </div>` : "";

        let deriv1Html = data["派生語1"] ? `
            <div style="margin-bottom: 10px;">
                <strong style="color: #e67e22;">【派生語 1】</strong><br>
                <span style="font-weight: bold;">${data["派生語1"]}</span>
                <span style="color: #666;"> [${data["品詞1"] || ""}]</span><br>
                <span>${data["意味1.1"] || ""}</span>
            </div>` : "";

        let deriv2Html = data["派生語2"] ? `
            <div style="margin-bottom: 10px;">
                <strong style="color: #e67e22;">【派生語 2】</strong><br>
                <span style="font-weight: bold;">${data["派生語2"]}</span>
                <span style="color: #666;"> [${data["品詞2"] || ""}]</span><br>
                <span>${data["意味2.1"] || ""}</span>
            </div>` : "";

        dDisplay.innerHTML = `<hr style="margin: 15px 0; border: 0; border-top: 2px dotted #eee;">${otherPosHtml}${deriv1Html}${deriv2Html}`;
    } else {
        dButton.style.display = "none";
    }

    updateProgress();
}

// 保存処理（正常コードのロジック）
window.toggleMastered = async function(event) {
    const word = wordList[currentIndex]["Word"];
    
    if (event.target.checked) {
        if (!masteredWords.includes(word)) masteredWords.push(word);
    } else {
        masteredWords = masteredWords.filter(w => w !== word);
    }

    document.getElementById("complete-badge").style.display = event.target.checked ? "block" : "none";
    updateProgress();

    try {
        await window.fs.setDoc(window.fs.doc(window.db, "progress", studentName), {
            words: masteredWords,
            updatedAt: new Date()
        });
    } catch (e) { console.error("保存エラー:", e); }
};

function updateProgress() {
    const total = wordList.length;
    const current = currentIndex + 1;
    document.getElementById("progress-text").innerText = `${current} / ${total}`;
    document.getElementById("progress-bar").style.width = `${(current / total) * 100}%`;
}

window.nextCard = function() {
    if (currentIndex < wordList.length - 1) {
        currentIndex++;
        document.getElementById('card').classList.remove('is-flipped');
        displayCard();
    } else {
        alert("Unitの終了です！");
    }
};

window.prevCard = function() {
    if (currentIndex > 0) {
        currentIndex--;
        document.getElementById('card').classList.remove('is-flipped');
        displayCard();
    }
};

window.toggleDerived = function(event) {
    event.stopPropagation();
    const d = document.getElementById('derived-display');
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
};