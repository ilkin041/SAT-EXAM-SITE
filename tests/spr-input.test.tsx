import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SprInput } from "@/app/test/attempt/[attemptId]/spr-input";

describe("SprInput", () => {
  it("limits positive responses to five characters", () => {
    const onChange = vi.fn();
    render(<SprInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "123456" } });
    expect(onChange).toHaveBeenCalledWith("12345");
  });

  it("allows six characters when the first is a negative sign", () => {
    const onChange = vi.fn();
    render(<SprInput value="-" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "-12.34" } });
    expect(onChange).toHaveBeenCalledWith("-12.34");
  });
});
