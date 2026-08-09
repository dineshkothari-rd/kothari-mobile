export const expenseCategories = [
  { label: 'All', value: '' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Utility', value: 'utility' },
  { label: 'Staff', value: 'staff' },
  { label: 'Supplies', value: 'supplies' },
  { label: 'Rent', value: 'rent' },
  { label: 'Other', value: 'other' },
];

export const editableExpenseCategories = expenseCategories.filter((category) => category.value);

export function getExpenseCategory(value: unknown) {
  return expenseCategories.find((category) => category.value === value) || expenseCategories[expenseCategories.length - 1];
}
