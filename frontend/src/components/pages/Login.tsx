import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { RequestResponse } from "@/lib/types";

interface LoginRequest {
  username: string;
  password: string;
  requested_role: string;
}

interface LoginResponse {
  token: string;
}

function Login({ role }: { role: string }) {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    const jwt = sessionStorage.getItem("jwt");

    if (!jwt) {
      return;
    }

    navigate("/circuits/dashboard");
  }, [navigate]);

  const loginMutation: UseMutationResult<
    RequestResponse<LoginResponse>,
    Error,
    LoginRequest
  > = useMutation({
    mutationFn: async (
      data: LoginRequest,
    ): Promise<RequestResponse<LoginResponse>> => {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      return await response.json();
    },
    onSuccess: (response: RequestResponse<LoginResponse>) => {
      if (response.status === "error") {
        toast.error(`Login failed: ${response.message}`);
        return;
      }

      sessionStorage.setItem("jwt", response.data.token);
      toast.success("Login Successful");
      navigate("/circuits/dashboard");
    },
    onError: (error) => {
      console.error("Error:", error);
      toast.error(`Login failed: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    loginMutation.mutate({ username, password, requested_role: role });
  };

  const redirectRole = role === "admin" ? "user" : "admin";
  const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <Card className="w-[350px] mt-24">
      <CardHeader>
        <CardTitle>{capitalizedRole} Login</CardTitle>
        <CardDescription>Enter your provided password</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="name">Username</Label>
            <Input
              id="username"
              placeholder="Name of account"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="name">Password</Label>
            <Input
              id="password"
              type="password"
              required
              placeholder="Password provided to you"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center flex-col gap-4 place-items-center">
        <Button
          onClick={handleSubmit}
          disabled={loginMutation.isPending}
          className=""
        >
          {loginMutation.isPending ? (
            <>
              <p className="leading-7 [&:not(:first-child)]:mt-6 mr-2">
                Loading...
              </p>
              <LoaderCircle className="animate-spin" />
            </>
          ) : (
            "Submit"
          )}
        </Button>
        <Link
          to={`/${redirectRole}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Go to {redirectRole} login
        </Link>
      </CardFooter>
    </Card>
  );
}

export default Login;
