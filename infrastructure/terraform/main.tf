terraform {
  required_providers {
    linode = {
      source = "linode/linode"
      version = "4.7.0"
    }
  }
}

provider "linode" {
  token = var.linode_token
}

resource "linode_lke_cluster" "cluster" {
  label      = "lexico-prod" # Make sure this matches your cluster's label
  k8s_version = "1.34"       # Use the same Kubernetes version as your cluster
  region     = var.linode_region

  pool {
    type  = "g6-standard-1" # Match the node type
    count = 1               # Match the number of nodes

    autoscaler {
      min = 1
      max = 3
    }
  }

  timeouts {}
}

output "kubeconfig" {
  value     = linode_lke_cluster.cluster.kubeconfig
  sensitive = true
}
