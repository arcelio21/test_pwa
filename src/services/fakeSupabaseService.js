const OPERATION_DELAY = 1000;

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function fakeUploadRecord(record) {
  await wait(OPERATION_DELAY);
  return {
    ...record,
    syncStatus: "sincronizado"
  };
}

export async function fakeDeleteRecord(record) {
  await wait(OPERATION_DELAY);
  return {
    ...record,
    syncStatus: "sincronizado"
  };
}

export async function fakeSyncRecords(records) {
  const syncedRecords = [];

  for (const record of records) {
    if (record.estado === "eliminado") {
      syncedRecords.push(await fakeDeleteRecord(record));
    } else {
      syncedRecords.push(await fakeUploadRecord(record));
    }
  }

  return syncedRecords;
}
