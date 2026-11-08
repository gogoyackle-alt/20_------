'use strict';

window.addEventListener(
  'storage',
  () => {
    setupEquipmentSelect();
  }
);

const reservations = [];

let editingReservationId = null;

const equipmentSelect = document.getElementById('equipmentSelect');
const userNameInput = document.getElementById('userName');
const startDateTimeInput = document.getElementById('startDateTime');
const endDateTimeInput = document.getElementById('endDateTime');
const summaryCount = document.getElementById('summaryCount');
const summaryUser = document.getElementById('summaryUser');
const equipmentList = document.getElementById('equipmentList');
const addBtn = document.getElementById('addBtn');
const printBtn = document.getElementById('printBtn');

const duplicateList =
  document.getElementById('duplicateList');

const EQUIPMENT_MASTER_KEY =
  'equipmentMaster';

function getEquipments() {

    const data =
        localStorage.getItem('equipmentMaster');

    if (!data) return [];

    return JSON.parse(data);
}

function getAvailableEquipments() {

    return getEquipments().filter(
        item => item.status === 'available'
    );
}

function saveReservations() {
  localStorage.setItem(
    'equipmentReservations',
    JSON.stringify(reservations)
  );
}

function loadReservations() {

  reservations.length = 0;

  const savedData =
    localStorage.getItem(
      'equipmentReservations'
    );

  if (!savedData) {
    return;
  }

  try {

    const parsedData =
      JSON.parse(savedData);

      parsedData.forEach(item => {

        if (!item.id) {
          item.id = crypto.randomUUID();
        }

        reservations.push(item);

      });

  } catch (error) {

    console.error(
      '予約データの読み込みに失敗しました',
      error
    );

  }
}

function setupEquipmentSelect() {

  equipmentSelect.innerHTML = '';

  const equipments =
      getEquipments();

  equipments.forEach(item => {

    const option =
      document.createElement('option');

    option.value = item.name;
    option.textContent = item.name;

    if (item.status !== 'available') {

      option.disabled = true;

      let statusLabel = '利用停止';

      if (item.status === 'repair') {
        statusLabel = '修理中';
      }

      option.textContent =
        `${item.name}（${statusLabel}）`;
    }

    equipmentSelect.appendChild(option);
  });
}

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);

  return `${date.getFullYear()}/${String(
    date.getMonth() + 1
  ).padStart(2, '0')}/${String(
    date.getDate()
  ).padStart(2, '0')} ${String(
    date.getHours()
  ).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
}

function hasOverlap(current, other) {
  const currentStart = new Date(current.startDateTime).getTime();
  const currentEnd = new Date(current.endDateTime).getTime();
  const otherStart = new Date(other.startDateTime).getTime();
  const otherEnd = new Date(other.endDateTime).getTime();

  return currentStart < otherEnd && otherStart < currentEnd;
}

function getOverlapInfo(
  reservation,
  equipmentName
) {
  const overlapReservation =
    reservations.find(
      (item) =>
        item !== reservation &&
        item.equipment === equipmentName &&
        hasOverlap(reservation, item)
    );

  if (!overlapReservation) {
    return null;
  }

  const overlapStart = new Date(
    Math.max(
      new Date(
        reservation.startDateTime
      ).getTime(),
      new Date(
        overlapReservation.startDateTime
      ).getTime()
    )
  );

  const overlapEnd = new Date(
    Math.min(
      new Date(
        reservation.endDateTime
      ).getTime(),
      new Date(
        overlapReservation.endDateTime
      ).getTime()
    )
  );

  return {
    borrower:
      overlapReservation.borrower,
    overlapStart,
    overlapEnd
  };
}

function getReservationPriority(reservation, equipmentName) {
  const sameEquipmentReservations = reservations.filter(
    (item) => item.equipment === equipmentName
  );

  const earlier = sameEquipmentReservations.filter((item) => {
    return (
      hasOverlap(reservation, item) &&
      new Date(item.startDateTime).getTime() <
        new Date(reservation.startDateTime).getTime()
    );
  });

  if (earlier.length > 0) {
    return 'later';
  }

  const sameStart = sameEquipmentReservations.filter((item) => {
    return (
      hasOverlap(reservation, item) &&
      new Date(item.startDateTime).getTime() ===
        new Date(reservation.startDateTime).getTime()
    );
  });

  if (sameStart.length > 0 && sameStart[0] !== reservation) {
    return 'later';
  }

  return 'earlier';
}

function getOverlapMemo(
  reservation,
  equipmentName
) {
  const overlapInfo =
    getOverlapInfo(
      reservation,
      equipmentName
    );

  if (!overlapInfo) {
    return '✅ 利用予定';
  }

  return `
    ⚠ ${overlapInfo.borrower}と重複
    <br>
    重複時間:
    <br>
    ${formatDateTime(
      overlapInfo.overlapStart
    )}
    <br>
    ～<br>
    ${formatDateTime(
      overlapInfo.overlapEnd
    )}
  `;
}

/*
 * datetime-local 用
 * 現在時刻を10分単位に切り上げ
 */
function formatDateTime10Min(date = new Date()) {
  const d = new Date(date);

  d.setSeconds(0);
  d.setMilliseconds(0);

  d.setMinutes(
    Math.ceil(d.getMinutes() / 10) * 10
  );

  if (d.getMinutes() === 60) {
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
  }

  const year = d.getFullYear();
  const month = String(
    d.getMonth() + 1
  ).padStart(2, '0');
  const day = String(
    d.getDate()
  ).padStart(2, '0');
  const hours = String(
    d.getHours()
  ).padStart(2, '0');
  const minutes = String(
    d.getMinutes()
  ).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/*
 * 初期日時設定
 */
function setDefaultDateTime() {
  const start = new Date();

  const end = new Date(start);

  end.setHours(end.getHours() + 1);

  startDateTimeInput.value =
    formatDateTime10Min(start);

  endDateTimeInput.value =
    formatDateTime10Min(end);
}

function renderList() {

  summaryCount.textContent = String(reservations.length);

  const equipmentData =
      getEquipments().map(
          item => item.name
      );

  // 重複している備品を取得
  const duplicateEquipments = equipmentData.filter((equipmentName) => {

    const itemReservations = reservations.filter(
      reservation => reservation.equipment === equipmentName
    );

    return itemReservations.some((reservation) => {

      return itemReservations.some((other) => {

        return reservation !== other &&
               hasOverlap(reservation, other);

      });

    });

  });

  // 件数表示
  summaryUser.textContent = `${duplicateEquipments.length}件`;

  // 備品名一覧表示
  if (duplicateEquipments.length === 0) {

    if (duplicateList) {
      duplicateList.textContent = 'なし';
    }

  } else {

    const duplicateDetails =
      duplicateEquipments.map(
        (equipmentName) => {

          const itemReservations =
            reservations.filter(
              reservation =>
                reservation.equipment === equipmentName
            );

          const overlaps = [];

          itemReservations.forEach(
            (reservation, index) => {

              itemReservations
                .slice(index + 1)
                .forEach((other) => {

                  if (
                    hasOverlap(
                      reservation,
                      other
                    )
                  ) {

                    const overlapStart =
                      new Date(
                        Math.max(
                          new Date(
                            reservation.startDateTime
                          ).getTime(),
                          new Date(
                            other.startDateTime
                          ).getTime()
                        )
                      );

                    const overlapEnd =
                      new Date(
                        Math.min(
                          new Date(
                            reservation.endDateTime
                          ).getTime(),
                          new Date(
                            other.endDateTime
                          ).getTime()
                        )
                      );

                    overlaps.push(
                      `
                      ● ${equipmentName}<br>
                      ${reservation.borrower}
                      ⇔
                      ${other.borrower}<br>
                      (${formatDateTime(overlapStart)}
                      ～${formatDateTime(overlapEnd)})
                      `
                    );
                  }

                });

            });

          return overlaps.join('<br><br>');
        }
      );

    if (duplicateList) {
      duplicateList.innerHTML =
        duplicateDetails.join('<br>');
    }

  }

  if (reservations.length === 0) {

    equipmentList.innerHTML = `
      <article class="equipment-card empty-card">
        <h3>予約はまだありません</h3>
        <p>上のフォームから備品を選んで、開始日時と終了日時を指定してください。</p>
      </article>
    `;
    return;
  }

  const items = equipmentData.map(
    (equipmentName) => {
      const itemReservations = reservations.filter(
            reservation =>
              reservation.equipment === equipmentName
          )
          .sort(
            (a,b)=>
              new Date(a.startDateTime) - new Date(b.startDateTime)
          );
      return `
      <article class="equipment-card">
        <div class="equipment-header">
          <h3>${equipmentName}</h3>
          <span class="equipment-badge">${itemReservations.length}件</span>
        </div>

        <div class="equipment-table-wrap">
          <table class="reservation-table">

            <thead>
              <tr>
                <th>借用者</th>
                <th>開始日時</th>
                <th>終了日時</th>
                <th>備考</th>
              </tr>
            </thead>

            <tbody>
            ${
              itemReservations.length > 0
                ? itemReservations
                    .map((reservation) => {

                      const priority =
                        getReservationPriority(
                          reservation,
                          equipmentName
                        );

                      const rowClass =
                        priority === 'earlier'
                          ? 'priority-earlier'
                          : 'priority-later';

                      return `
                        <tr class="${rowClass}">

                          <td>
                            ${reservation.borrower}
                          </td>

                          <td>${formatDateTime(
                            reservation.startDateTime
                          )}
                          </td>

                          <td>${formatDateTime(
                            reservation.endDateTime
                          )}
                          </td>

                          <td class="memo-cell">

                            ${getOverlapMemo(
                              reservation,
                              equipmentName
                            )}

                            <div class="action-buttons">

                              <button
                                type="button"
                                class="edit-btn"
                                onclick="editReservation('${reservation.id}')"
                              >
                                予約編集
                              </button>

                              <button
                                type="button"
                                class="delete-btn"
                                onclick="deleteReservation('${reservation.id}')"
                              >
                                予約取消
                              </button>

                            </div>

                          </td>

                        </tr>
                      `;
                    })
                    .join('')
                : '<tr><td colspan="4">予約なし</td></tr>'
            }
            </tbody>

          </table>
        </div>
      </article>
      `;
    }
  );

  equipmentList.innerHTML = items.join('');
}

function editReservation(id) {

  const reservation =
    reservations.find(
      item => item.id === id
    );

  if (!reservation) {
    return;
  }

  editingReservationId = id;

  equipmentSelect.value =
    reservation.equipment;

  userNameInput.value =
    reservation.borrower;

  startDateTimeInput.value =
    reservation.startDateTime;

  endDateTimeInput.value =
    reservation.endDateTime;

  addBtn.textContent =
    '✎ 予約を更新';

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function deleteReservation(id) {

  const index =
    reservations.findIndex(
      reservation =>
        reservation.id === id
    );

  if (index === -1) {
    return;
  }

  reservations.splice(index, 1);

  saveReservations();
  renderList();

  editingReservationId = null;
  addBtn.textContent =
    '＋ 予約を追加';
}

function addReservation() {
  const equipment =
    equipmentSelect.value;

  const borrower =
    userNameInput.value.trim() ||
    '未入力';

  const startDateTime =
    startDateTimeInput.value;

  const endDateTime =
    endDateTimeInput.value;

  if (!canReserve(equipment)) {

    alert(
      'この備品は現在貸出できません。'
    );

    return;

  }

  if (!startDateTime || !endDateTime) {
    alert(
      '借用開始日時と借用終了日時を入力してください。'
    );
    return;
  }

  const start =
    new Date(startDateTime);

  const end =
    new Date(endDateTime);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    alert(
      '日時の形式が正しくありません。'
    );
    return;
  }

  if (start >= end) {
    alert(
      '借用終了日時は開始日時より後に設定してください。'
    );
    return;
  }

  if (editingReservationId) {

    const reservation =
      reservations.find(
        item =>
          item.id === editingReservationId
      );

    if (reservation) {

      reservation.equipment =
        equipment;

      reservation.borrower =
        borrower;

      reservation.startDateTime =
        startDateTime;

      reservation.endDateTime =
        endDateTime;
    }

    editingReservationId = null;

    addBtn.textContent =
      '＋ 予約を追加';

  } else {

    reservations.push({
      id: crypto.randomUUID(),
      equipment,
      borrower,
      startDateTime,
      endDateTime
    });

  }

  // 保存
  saveReservations();

  // 備品選択だけ初期化
  equipmentSelect.selectedIndex = 0;

  renderList();
}

function canReserve(equipmentName) {

    const equipment =
        getEquipments().find(
            item => item.name === equipmentName
        );

    return (
        equipment &&
        equipment.status === 'available'
    );
}

addBtn.addEventListener(
  'click',
  addReservation
);

printBtn.addEventListener(
  'click',
  () => window.print()
);

setupEquipmentSelect();

loadReservations();

setDefaultDateTime();

renderList();

window.editReservation =
  editReservation;

window.deleteReservation =
  deleteReservation;
