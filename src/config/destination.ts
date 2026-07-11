// This is light spoiler deterrence, not real security: compiled browser code remains inspectable.
const decode = (values: number[]) => String.fromCharCode(...values);

export const getDestination = () => ({
  city: decode([78, 101, 119, 32, 72, 97, 118, 101, 110]),
  state: decode([67, 111, 110, 110, 101, 99, 116, 105, 99, 117, 116]),
});
