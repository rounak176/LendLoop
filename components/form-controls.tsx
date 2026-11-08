"use client";
import { useState, type ComponentProps } from "react";
import { Input } from "baseui/input";
import { Textarea } from "baseui/textarea";

// Preserve native form submission while using Base Web's controlled inputs.
export function FormInput(props: ComponentProps<"input">) {
  const [value, setValue] = useState(String(props.defaultValue ?? ""));
  return <Input id={props.id} name={props.name} type={props.type ?? "text"}
    required={props.required} overrides={{ Input: { props: { minLength: props.minLength, maxLength: props.maxLength } } }}
    placeholder={props.placeholder} value={value} onChange={event => setValue(event.currentTarget.value)}
    onKeyDown={event => { if (event.key === "Escape") event.currentTarget.blur(); }} />;
}
export function FormTextarea(props: ComponentProps<"textarea">) {
  const [value, setValue] = useState(String(props.defaultValue ?? ""));
  return <Textarea id={props.id} name={props.name} maxLength={props.maxLength}
    placeholder={props.placeholder} value={value} onChange={event => setValue(event.currentTarget.value)} />;
}
