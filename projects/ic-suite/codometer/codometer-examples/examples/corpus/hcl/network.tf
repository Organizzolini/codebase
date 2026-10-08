# A sample network, written so the HCL analyzer has blocks to count.

variable "environment" {
  type    = string
  default = "sample"
}

variable "address_range" {
  type    = string
  default = "10.0.0.0/16"
}

resource "network_segment" "orders" {
  address_range = var.address_range

  labels = {
    name = "orders-${var.environment}"
  }
}

resource "network_route" "orders" {
  segment     = network_segment.orders.identifier
  destination = "0.0.0.0/0"
}

output "segment_identifier" {
  value = network_segment.orders.identifier
}
