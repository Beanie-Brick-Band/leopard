terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

# Variables
variable "tenancy_ocid" {}
variable "user_ocid" {}
variable "fingerprint" {}
variable "private_key_path" {}
variable "region" {
  default = "ca-toronto-1"
}
variable "compartment_ocid" {}
variable "ssh_public_key" {}

# Get the latest Ubuntu image for A1 (ARM) shape
data "oci_core_images" "ubuntu" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# VCN (Virtual Cloud Network)
resource "oci_core_vcn" "main_vcn" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = ["10.0.0.0/16"]
  display_name   = "main-vcn"
  dns_label      = "mainvcn"
}

# Internet Gateway
resource "oci_core_internet_gateway" "main_ig" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main_vcn.id
  display_name   = "main-internet-gateway"
  enabled        = true
}

# Route Table
resource "oci_core_route_table" "main_route_table" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main_vcn.id
  display_name   = "main-route-table"

  route_rules {
    network_entity_id = oci_core_internet_gateway.main_ig.id
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
  }
}

# Security List - All ports open
resource "oci_core_security_list" "public_security_list" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main_vcn.id
  display_name   = "public-security-list"

  # Ingress - Allow all
  ingress_security_rules {
    protocol = "all"
    source   = "0.0.0.0/0"
  }

  # Egress - Allow all
  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
  }
}

# Subnet
resource "oci_core_subnet" "public_subnet" {
  compartment_id      = var.compartment_ocid
  vcn_id              = oci_core_vcn.main_vcn.id
  cidr_block          = "10.0.1.0/24"
  display_name        = "public-subnet"
  dns_label           = "publicsubnet"
  route_table_id      = oci_core_route_table.main_route_table.id
  security_list_ids   = [oci_core_security_list.public_security_list.id]
  prohibit_public_ip_on_vnic = false
}

# Get availability domains
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

# Compute Instance - VM.Standard.A1.Flex (ARM) with 4 OCPUs and 24GB RAM
resource "oci_core_instance" "ubuntu_vm" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "ubuntu-vm"
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = 4
    memory_in_gbs = 24
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ubuntu.images[0].id
    boot_volume_size_in_gbs = 50
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public_subnet.id
    assign_public_ip = true
    display_name     = "primary-vnic"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data = base64encode(<<-EOF
      #!/bin/bash
      # Disable Ubuntu firewall
      ufw disable

      # Open all iptables rules
      iptables -P INPUT ACCEPT
      iptables -P FORWARD ACCEPT
      iptables -P OUTPUT ACCEPT
      iptables -F

      # Install iptables-persistent to save rules
      echo iptables-persistent iptables-persistent/autosave_v4 boolean true | debconf-set-selections
      echo iptables-persistent iptables-persistent/autosave_v6 boolean true | debconf-set-selections
      apt-get update
      apt-get install -y iptables-persistent

      # Save the permissive rules
      netfilter-persistent save
    EOF
    )
  }
}

# Outputs
output "instance_public_ip" {
  value = oci_core_instance.ubuntu_vm.public_ip
}

output "instance_private_ip" {
  value = oci_core_instance.ubuntu_vm.private_ip
}

output "instance_id" {
  value = oci_core_instance.ubuntu_vm.id
}

output "ssh_command" {
  value = "ssh ubuntu@${oci_core_instance.ubuntu_vm.public_ip}"
}
