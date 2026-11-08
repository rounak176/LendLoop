"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from "baseui/modal";

const SuccessContext = createContext<(title: string, detail?: string) => void>(() => {});
export function SuccessFeedback({ children }: { children: ReactNode }) {
  const [success, setSuccess] = useState<{ title: string; detail?: string } | null>(null);
  return <SuccessContext.Provider value={(title, detail) => setSuccess({ title, detail })}>
    {children}
    <Modal isOpen={success !== null} onClose={() => setSuccess(null)} aria-label={success?.title ?? "Success"}>
      <ModalHeader>{success?.title}</ModalHeader>
      <ModalBody>{success?.detail ?? "Your changes have been saved."}</ModalBody>
      <ModalFooter><ModalButton onClick={() => setSuccess(null)}>Done</ModalButton></ModalFooter>
    </Modal>
  </SuccessContext.Provider>;
}
export const useSuccess = () => useContext(SuccessContext);
