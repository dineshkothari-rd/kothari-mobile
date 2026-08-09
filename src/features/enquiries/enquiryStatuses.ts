export const enquiryStatuses = [
  { label: 'All', value: '' },
  { label: 'New', value: 'New' },
  { label: 'Contacted', value: 'Contacted' },
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'Closed', value: 'Closed' },
];

export const editableEnquiryStatuses = enquiryStatuses.filter((status) => status.value);
