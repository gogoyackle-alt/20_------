'use strict';

const equipmentNameInput =
  document.getElementById('equipmentName');

const addBtn =
  document.querySelector('.add-btn');

const equipmentList =
  document.querySelector('.equipment-list');

const STORAGE_KEY = 'equipmentMaster';

let equipments = [];

/* 初期データ */
function initializeEquipments() {

    const savedData =
        localStorage.getItem(STORAGE_KEY);

    if (savedData) {

        equipments =
            JSON.parse(savedData);

        return;
    }

    equipments =
        EQUIPMENT_MASTER.map(name => ({
            id: crypto.randomUUID(),
            name,
            status: 'available'
        }));

    saveEquipments();
}

/* 保存 */
function saveEquipments() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(equipments)
  );

}

/* 状態表示 */
function getStatusText(status){
  switch(status){
    case 'available':
      return '利用可';

    case 'unavailable':
      return '利用停止';

    case 'repair':
      return '修理中';

    default:
      return '利用可';
  }
}

/* 一覧表示 */
function renderEquipmentList() {

  equipmentList.innerHTML =
    equipments
      .map(item => {

        return `
          <article class="equipment-card">
            <div class="equipment-header">
              <span class="equipment-name">
                ${item.name}
              </span>

              <button
                class="delete-btn"
                onclick="deleteEquipment(
                  '${item.id}'
                )">
                備品削除
              </button>
            </div>

            <div class="status-area">
              <label>状態</label>
							<select onchange="updateStatus('${item.id}',this.value)">
                <option value="available"
                  ${item.status === "available" ? "selected" : ""}>
                  利用可
                </option>

                <option value="unavailable"
                  ${item.status === "unavailable" ? "selected" : ""}>
                  利用不可
                </option>

                <option value="repair"
                  ${item.status === "repair" ? "selected" : ""}>
                  修理中
                </option>
							</select>
						</div>
          </article>
        `;

      })
      .join('');

}

/* 備品追加 */
function addEquipment() {

  const name =
    equipmentNameInput.value.trim();

  if (!name) {

    alert(
      '備品名を入力してください。'
    );

    return;

  }

  if (
    equipments.some(
      item => item.name === name
    )
  ) {
    alert('同名の備品が既にあります');
    return;
  }

  equipments.push({

    id: crypto.randomUUID(),

    name,

    status: 'available'

  });

  equipmentNameInput.value = '';

  saveEquipments();

  renderEquipmentList();

}

/* 状態変更 */
function updateStatus(id, status) {

    const equipment =
        equipments.find(
            item => item.id === id
        );

    if (!equipment) return;

    equipment.status = status;

    saveEquipments();

    renderEquipmentList();
}

/* 削除予定備品予約件数取得 */
function getReservationCount(equipmentName) {

  const reservationData =
    localStorage.getItem(
      'equipmentReservations'
    );

  if (!reservationData) {
    return 0;
  }

  try {

    const reservations =
      JSON.parse(reservationData);

    return reservations.filter(
      reservation =>
        reservation.equipment ===
        equipmentName
    ).length;

  } catch (error) {

    console.error(
      '予約データの読み込みに失敗しました',
      error
    );

    return 0;
  }

}

/* 削除予定備品予約情報取得 */
function getReservationInfo(equipmentName) {

  const reservationData =
    localStorage.getItem(
      'equipmentReservations'
    );

  if (!reservationData) {
    return [];
  }

  try {

    const reservations =
      JSON.parse(reservationData);

    return reservations
      .filter(
        reservation =>
          reservation.equipment ===
          equipmentName
      )
      .map(
        reservation => ({
          borrower:
            reservation.borrower,
          startDateTime:
            reservation.startDateTime,
          endDateTime:
            reservation.endDateTime
        })
      );

  } catch (error) {

    console.error(
      '予約データの読み込みに失敗しました',
      error
    );

    return [];
  }
}

/* 備品削除 */
function deleteEquipment(id) {

  const equipment =
    equipments.find(
      item => item.id === id
    );

  if (!equipment) {
    return;
  }

  const reservationCount =
    getReservationCount(
      equipment.name
    );

  const reservationInfo =
    getReservationInfo(
      equipment.name
    );

  if (reservationCount > 0) {

    const reservationList =
      reservationInfo
        .map(item =>
          `・${item.borrower}
    ${formatDateTime(item.startDateTime)}
    ～ ${formatDateTime(item.endDateTime)}`
        )
        .join('\n\n');

    alert(
      `「${equipment.name}」には${reservationCount}件の予約が登録されているため削除できません。\n\n` +
      `予約一覧:\n\n${reservationList}\n\n` +
      '予約者へ事情を説明し、\n' +
      '予約変更または取消を行ってください。'
    );

    return;
  }

  if (!confirm('削除しますか？')) {
    return;
  }

  const index =
    equipments.findIndex(
      item => item.id === id
    );

  if (index === -1) {
    return;
  }

  equipments.splice(index, 1);

  saveEquipments();

  renderEquipmentList();

}

/* 日付整形 */
function formatDateTime(dateTimeString) {

  const date = new Date(dateTimeString);

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');
  const day = String(
    date.getDate()
  ).padStart(2, '0');

  const hours = String(
    date.getHours()
  ).padStart(2, '0');

  const minutes = String(
    date.getMinutes()
  ).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}



window.updateStatus =
  updateStatus;

window.deleteEquipment =
  deleteEquipment;

addBtn.addEventListener(
  'click',
  addEquipment
);

initializeEquipments();

renderEquipmentList();
