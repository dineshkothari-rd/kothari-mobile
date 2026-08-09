export const noticeTypes = [
  { label: 'All', value: '' },
  { label: 'Info', value: 'info' },
  { label: 'Good News', value: 'success' },
  { label: 'Warning', value: 'warning' },
  { label: 'Urgent', value: 'danger' },
];

export const editableNoticeTypes = noticeTypes.filter((type) => type.value);

export function getNoticeType(type: unknown) {
  return noticeTypes.find((item) => item.value === type) || noticeTypes[1];
}
