import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { getErrorMessage } from "@/lib/api";
import { loginRequest } from "@/features/auth/api";
import { useAuth } from "@/features/auth/use-auth";
import { AuthCard } from "@/features/auth/auth-card";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: LoginValues) => loginRequest(values.email, values.password),
    onSuccess: (data) => {
      login(data.accessToken);
      navigate("/", { replace: true });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not sign in"));
    },
  });

  return (
    <AuthCard
      title="Sign in"
      footer={
        <>
          No account yet?{" "}
          <Link to="/register" className="text-primary underline-offset-4 hover:underline">
            Sign up
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
          id="email"
          label="Email"
          type="email"
          autoFocus
          autoComplete="email"
          disabled={mutation.isPending}
          error={errors.email?.message}
          {...register("email")}
        />

        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          disabled={mutation.isPending}
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
