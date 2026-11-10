// Firebase v10 CDN 모듈 로드
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 1. 설정값 입력 (Firebase 및 공공데이터포털)
const firebaseConfig = {
  apiKey: "AIzaSyAYaoKIWqFJSXD9Beh-WuW9WwvmxeU-0E0",
  authDomain: "myproject-500c7.firebaseapp.com",
  databaseURL: "https://myproject-500c7-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "myproject-500c7",
  storageBucket: "myproject-500c7.firebasestorage.app",
  messagingSenderId: "543429901115",
  appId: "1:543429901115:web:df89731d5c8c46e087151e"
};

// 공공데이터포털 일반 인증키 (Decoding 키 권장)
const TOUR_API_KEY = "Dpva6vJJ1NWDNGeibLpRCDAGFK8SpHKi+Xz0cYf5UbV88z1wfNpKdrRYDUVfR/CTgZ3K3zPzGLLQJcifSI/CLg==";

// 2. Firebase 인스턴스 초기화
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db);

// 3. DOM 요소 참조
const areaSelect = document.getElementById("areaSelect");
const tourListSection = document.getElementById("tourListSection");
const tourCardGrid = document.getElementById("tourCardGrid");
const currentRegionTitle = document.getElementById("currentRegionTitle");
const statusMessage = document.getElementById("statusMessage");

// 4. 공공데이터포털 API 호출 (지역기반 관광정보 조회)
async function fetchTourData(areaCode) {
  const endpoint = "https://apis.data.go.kr/B551011/KorService2/areaBasedList2";
  const params = new URLSearchParams({
    serviceKey: TOUR_API_KEY,
    numOfRows: "12",
    pageNo: "1",
    MobileOS: "ETC",
    MobileApp: "TourApp",
    _type: "json",
    areaCode: areaCode,
    arrange: "Q" // 이미지 있는 콘텐츠 우선 정렬
  });

  try {
    statusMessage.textContent = "관광 정보를 불러오는 중...";
    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (!response.ok) throw new Error("API 응답 에러");
    
    const data = await response.json();
    const items = data.response?.body?.items?.item;

    statusMessage.textContent = "";
    return Array.isArray(items) ? items : (items ? [items] : []);
  } catch (error) {
    console.error("데이터 로드 실패:", error);
    statusMessage.textContent = "데이터를 가져오는 중 문제가 발생했습니다.";
    return [];
  }
}

// 5. 카드 뷰 UI 렌더링
function renderCards(items, areaName) {
  tourCardGrid.innerHTML = "";
  currentRegionTitle.textContent = `${areaName} 관광지 추천`;

  if (items.length === 0) {
    tourCardGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b;">등록된 관광 정보가 없습니다.</p>`;
    tourListSection.classList.remove("hidden");
    return;
  }

  items.forEach(item => {
    // 이미지가 없을 경우 대체 이미지 제공
    const imageUrl = item.firstimage || item.firstimage2 || "https://placehold.co/400x250?text=No+Image";
    const title = item.title || "정보 없음";
    const addr = item.addr1 || "상세 주소 미제공";

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <img src="${imageUrl}" alt="${title}" loading="lazy" />
      <div class="card-content">
        <h3 class="card-title">${title}</h3>
        <p class="card-addr">${addr}</p>
      </div>
    `;
    tourCardGrid.appendChild(card);
  });

  tourListSection.classList.remove("hidden");
}

// 6. Firebase에 사용자 선택 지역 저장/업데이트
async function saveRegionToFirebase(areaCode, areaName) {
  try {
    await set(ref(db, "userActivity/selectedRegion"), {
      areaCode: areaCode,
      areaName: areaName,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Firebase 저장 실패:", err);
  }
}

// 7. 지역 변경 이벤트 핸들러
areaSelect.addEventListener("change", async (e) => {
  const areaCode = e.target.value;
  const areaName = e.target.options[e.target.selectedIndex].text;

  if (!areaCode) {
    tourListSection.classList.add("hidden");
    return;
  }

  // 1) Firebase 업데이트
  await saveRegionToFirebase(areaCode, areaName);
  
  // 2) API 호출 및 렌더링
  const tourItems = await fetchTourData(areaCode);
  renderCards(tourItems, areaName);
});

// 8. 초기 로드 시 Firebase 데이터 확인 및 복원
async function initializeAppWithSavedRegion() {
  try {
    statusMessage.textContent = "저장된 설정 확인 중...";
    const snapshot = await get(child(dbRef, "userActivity/selectedRegion"));

    if (snapshot.exists()) {
      const savedData = snapshot.val();
      areaSelect.value = savedData.areaCode;
      
      const tourItems = await fetchTourData(savedData.areaCode);
      renderCards(tourItems, savedData.areaName);
    } else {
      // Firebase에 저장된 데이터가 없는 경우 뷰를 노출하지 않음
      tourListSection.classList.add("hidden");
    }
  } catch (err) {
    console.error("초기 데이터 복원 실패:", err);
    tourListSection.classList.add("hidden");
  } finally {
    statusMessage.textContent = "";
  }
}

initializeAppWithSavedRegion();
