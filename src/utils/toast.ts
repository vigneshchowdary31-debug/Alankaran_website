import { toast } from "@/hooks/use-toast";

/**
 * Global notification service wrapping Radix Toast infrastructure.
 * Future phases can invoke `showSuccess()` or `showError()` anywhere without additional setup or hook initialization.
 */
export const notificationService = {
  showSuccess(title: string, description?: string): void {
    toast({
      title,
      description,
      variant: "default",
    });
  },

  showError(title: string, description?: string): void {
    toast({
      title,
      description,
      variant: "destructive",
    });
  },

  showInfo(title: string, description?: string): void {
    toast({
      title,
      description,
      variant: "default",
    });
  },
};

export const { showSuccess, showError, showInfo } = notificationService;
export default notificationService;
