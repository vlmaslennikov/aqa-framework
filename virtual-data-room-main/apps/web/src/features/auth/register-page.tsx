import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { getErrorMessage } from "@/lib/api";
import { registerRequest } from "@/features/auth/api";
import { useAuth } from "@/features/auth/use-auth";
import { AuthCard } from "@/features/auth/auth-card";
import { registerSchema, type RegisterValues } from "@/features/auth/schemas";

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: RegisterValues) =>
      registerRequest(values.name, values.email, values.password),
    onSuccess: (data) => {
      login(data.accessToken);
      toast.success("Account created");
      navigate("/", { replace: true });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not create your account"));
    },
  });

  return (
    <AuthCard
      title="Sign up"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <FormField
          id="name"
          label="Full name"
          autoFocus
          autoComplete="name"
          disabled={mutation.isPending}
          error={errors.name?.message}
          {...register("name")}
        />

        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          disabled={mutation.isPending}
          error={errors.email?.message}
          {...register("email")}
        />

        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          disabled={mutation.isPending}
          error={errors.password?.message}
          {...register("password")}
        />

        <FormField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          disabled={mutation.isPending}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
