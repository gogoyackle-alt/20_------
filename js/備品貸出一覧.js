'use strict';

const equipmentData = [
  '1.展示パネル',
  '2.パネル脚',
  '3.机',
  '4.椅子',
  '5.プロジェクター①',
  '6.プロジェクター②',
  '7.テレビ(ロビー)',
  '8.テレビ(応接室)',
  '9.DVDデッキ',
  '10.スクリーン',
  '11.ポータブル',
  '12.ドラムコード①',
  '13.ドラムコード②',
  '14.ドラムコード③',
  '15.マイクスタンド',
  '16.紅白幕',
  '17.その他'
];

const reservations = [];

const equipmentSelect = document.getElementById('equipmentSelect');
const userNameInput = document.getElementById('userName');
const startDateTimeInput = document.getElementById('startDateTime');
const endDateTimeInput = document.getElementById('endDateTime');
const summaryCount = document.getElementById('summaryCount');
const summaryUser = document.getElementById('summaryUser');
const equipmentList = document.getElementById('equipmentList');
const addBtn = document.getElementById('addBtn');
const printBtn = document.getElementById('printBtn');

function setupEquipmentSelect() {
  equipmentData.forEach((item) => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    equipmentSelect.appendChild(option);
  });
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function hasOverlap(current, other) {
  const currentStart = new Date(current.startDateTime).getTime();
  const currentEnd = new Date(current.endDateTime).getTime();
  const otherStart = new Date(other.startDateTime).getTime();
  const otherEnd = new Date(other.endDateTime).getTime();

  return currentStart < otherEnd && otherStart < currentEnd;
}

function getReservationPriority(reservation, equipmentName) {
  const sameEquipmentReservations = reservations.filter((item) => item.equipment === equipmentName);
  const earlier = sameEquipmentReservations.filter((item) => {
    return (
      hasOverlap(reservation, item) &&
      new Date(item.startDateTime).getTime() < new Date(reservation.startDateTime).getTime()
    );
  });

  if (earlier.length > 0) {
    return 'later';
  }

  const sameStart = sameEquipmentReservations.filter((item) => {
    return (
      hasOverlap(reservation, item) &&
      new Date(item.startDateTime).getTime() === new Date(reservation.startDateTime).getTime()
    );
  });

  if (sameStart.length > 0 && sameStart[0] !== reservation) {
    return 'later';
  }

  return 'earlier';
}

function getOverlapMemo(reservation, equipmentName) {
  const sameEquipmentReservations = reservations.filter(
    (item) => item.equipment === equipmentName && item !== reservation
  );
  const overlapExists = sameEquipmentReservations.some((item) => hasOverlap(reservation, item));

  if (!overlapExists) {
    return '利用予定';
  }

  const priority = getReservationPriority(reservation, equipmentName);

  if (priority === 'later') {
    return '※時間重複あり：既存予約との調整をお願いします';
  }

  return '※時間重複あり：予約時間の調整が必要です';
}

function formatDateTime10Min(date = new Date()) {
  const d = new Date(date);

  // 10分単位に切り捨て
  d.setMinutes(Math.floor(d.getMinutes() / 10) * 10);
  d.setSeconds(0);
  d.setMilliseconds(0);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function renderList() {
  const selectedEquipment = equipmentSelect.value || equipmentData[0];
  summaryUser.textContent = selectedEquipment;
  summaryCount.textContent = String(reservations.length);

  if (reservations.length === 0) {
    equipmentList.innerHTML = `
      <article class="equipment-card empty-card">
        <h3>予約はまだありません</h3>
        <p>上のフォームから備品を選んで、開始日時と終了日時を指定してください。</p>
      </article>
    `;
    return;
  }

  const items = equipmentData.map((equipmentName) => {
    const itemReservations = reservations.filter((reservation) => reservation.equipment === equipmentName);

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
                        const priority = getReservationPriority(reservation, equipmentName);
                        const rowClass = priority === 'earlier' ? 'priority-earlier' : 'priority-later';
                        const memo = getOverlapMemo(reservation, equipmentName);
                        return `
                          <tr class="${rowClass}">
                            <td>${reservation.borrower}</td>
                            <td>${formatDateTime10Min(reservation.startDateTime)}</td>
                            <td>${formatDateTime10Min(reservation.endDateTime)}</td>
                            <td class="memo-cell">${memo}</td>
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
  });

  equipmentList.innerHTML = items.join('');
}

function addReservation() {
  const equipment = equipmentSelect.value;
  const borrower = userNameInput.value.trim() || '未入力';
  const startDateTime = startDateTimeInput.value;
  const endDateTime = endDateTimeInput.value;

  if (!startDateTime || !endDateTime) {
    window.alert('借用開始日時と借用終了日時を入力してください。');
    return;
  }

  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    window.alert('日時の形式が正しくありません。');
    return;
  }

  if (start >= end) {
    window.alert('借用終了日時は開始日時より後に設定してください。');
    return;
  }

  reservations.push({
    equipment,
    borrower,
    startDateTime,
    endDateTime
  });

  startDateTimeInput.value = '';
  endDateTimeInput.value = '';

  renderList();
}

addBtn.addEventListener('click', addReservation);
printBtn.addEventListener('click', () => {
  window.print();
});

setupEquipmentSelect();
renderList();
