import {
  Params,
  redirect,
  useLoaderData,
  useNavigate,
  useNavigation,
} from "react-router-dom";
import { queryClient } from "@/main";
import { Circuit, RequestResponse } from "@/lib/types";
import { LoaderCircle, ServerCrash } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";
import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function singleCircuitLoader({ params }: { params: Params }) {
  const id = params.id;

  const jwt = sessionStorage.getItem("jwt");

  if (!jwt) {
    return redirect("/");
  }

  return queryClient.fetchQuery({
    queryKey: ["Circuit", id],
    queryFn: async () => {
      const response = await fetch(`/api/circuits/${id}`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const json = await response.json();
      return json;
    },
  });
}

export async function updateCircuit(value: Circuit) {
  const jwt = sessionStorage.getItem("jwt");

  if (!jwt) {
    throw new Error("JWT is undefined. Please log in.");
  }

  const response = await fetch("/api/circuits/update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(value),
  });

  return await response.json();
}

export function CircuitDetail() {
  const fetchCircuitResponse = useLoaderData() as RequestResponse<Circuit>;
  const navigation = useNavigation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (navigation.state === "loading") {
    return (
      <div className="w-full m-4">
        <div className="w-full backdrop-blur-sm flex flex-row justify-center items-center">
          <LoaderCircle className="animate-spin" />
        </div>
      </div>
    );
  }

  if (fetchCircuitResponse.status === "error") {
    return (
      <div className="w-full m-4">
        <div className="w-full backdrop-blur-sm flex flex-row justify-center items-center">
          <ServerCrash />
          <p>{fetchCircuitResponse.message}</p>
        </div>
      </div>
    );
  }

  const [circuit, setCircuit] = React.useState<Circuit>(
    fetchCircuitResponse.data,
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setCircuit((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  };

  const saveCircuitChangesMutation = useMutation({
    mutationFn: updateCircuit,
    onSuccess: (response: RequestResponse<null>) => {
      if (response.status === "error") {
        toast.error(`Saving failed: ${response.message}`);
        return;
      }

      toast.success("Save Successful");
      queryClient.invalidateQueries({ queryKey: ["Circuit", circuit.id] });
      navigate("/circuits/dashboard");
    },
    onError: (error) => {
      console.error(error);
      toast.error(`Saving failed: ${error}`);
    },
  });

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Circuit Details</CardTitle>
        <CardDescription>
          View and update the details of this circuit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ckt_id">Circuit ID</Label>
            <Input
              id="ckt_id"
              value={circuit.ckt_id}
              onChange={handleChange}
              placeholder="C123456"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="state">Circuit State</Label>
            <Input
              id="state"
              value={circuit.state}
              onChange={handleChange}
              placeholder="Active"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="site_name">Site Name</Label>
            <Input
              id="site_name"
              value={circuit.site_name}
              onChange={handleChange}
              placeholder="Main Office"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="parent">Parent</Label>
            <Input
              id="parent"
              value={circuit.parent}
              onChange={handleChange}
              placeholder="Main Network"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="link_type">Link Type</Label>
            <Input
              id="link_type"
              value={circuit.link_type}
              onChange={handleChange}
              placeholder="Fiber"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider">Provider</Label>
            <Input
              id="provider"
              value={circuit.provider}
              onChange={handleChange}
              placeholder="Acme Telecom"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="z_loc">Z Location</Label>
            <Input
              id="z_loc"
              value={circuit.z_loc}
              onChange={handleChange}
              placeholder="Main Data Center"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rtr_name_z_loc">Router Name (Z Location)</Label>
            <Input
              id="rtr_name_z_loc"
              value={circuit.rtr_name_z_loc}
              onChange={handleChange}
              placeholder="Router-Z"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="to_description">To Description</Label>
            <Input
              id="to_description"
              value={circuit.to_description}
              onChange={handleChange}
              placeholder="Description of the 'To' end of the circuit"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rtr_port_z_loc">Router Port (Z Location)</Label>
            <Input
              id="rtr_port_z_loc"
              value={circuit.rtr_port_z_loc}
              onChange={handleChange}
              placeholder="Gi0/0/0"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="interf_ip_z_loc">Interface IP (Z Location)</Label>
            <Input
              id="interf_ip_z_loc"
              value={circuit.interf_ip_z_loc}
              onChange={handleChange}
              placeholder="10.0.0.1"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="a_loc">A Location</Label>
            <Input
              id="a_loc"
              value={circuit.a_loc}
              onChange={handleChange}
              placeholder="Branch Office"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rtr_name_a_loc">Router Name (A Location)</Label>
            <Input
              id="rtr_name_a_loc"
              value={circuit.rtr_name_a_loc}
              onChange={handleChange}
              placeholder="Router-A"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rtr_port">Router Port (A Location)</Label>
            <Input
              id="rtr_port"
              value={circuit.rtr_port}
              onChange={handleChange}
              placeholder="Gi0/0/1"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="interf_ip_a_loc">Interface IP (A Location)</Label>
            <Input
              id="interf_ip_a_loc"
              value={circuit.interf_ip_a_loc}
              onChange={handleChange}
              placeholder="10.0.0.2"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bw_mbps">Bandwidth (Mbps)</Label>
            <Input
              id="bw_mbps"
              value={circuit.bw_mbps}
              onChange={handleChange}
              placeholder="100"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="single_isp">Single ISP</Label>
            <Input
              id="single_isp"
              value={circuit.single_isp}
              onChange={handleChange}
              placeholder="Yes"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ups_closet">UPS Closet</Label>
            <Input
              id="ups_closet"
              value={circuit.ups_closet}
              onChange={handleChange}
              placeholder="Closet 1"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="router_ip">Router IP</Label>
            <Input
              id="router_ip"
              value={circuit.router_ip}
              onChange={handleChange}
              placeholder="192.168.1.1"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex justify-end">
          <Button
            onClick={() => saveCircuitChangesMutation.mutate(circuit)}
            disabled={saveCircuitChangesMutation.isPending}
          >
            {saveCircuitChangesMutation.isPending ? (
              <>
                <p className="leading-7 [&:not(:first-child)]:mt-6 mr-2">
                  Saving...
                </p>
                <LoaderCircle className="animate-spin" />
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
