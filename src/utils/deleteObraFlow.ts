type DeleteObraFlowOptions = {
  deleteObra: () => Promise<void>;
  onSuccess: () => void;
  onError: () => void;
};

export const executeDeleteObraFlow = async ({
  deleteObra,
  onSuccess,
  onError,
}: DeleteObraFlowOptions): Promise<boolean> => {
  try {
    await deleteObra();
    onSuccess();
    return true;
  } catch {
    onError();
    return false;
  }
};
