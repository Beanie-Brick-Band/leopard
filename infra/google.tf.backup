terraform {
  required_version = ">= 1.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Configure the Google Cloud provider
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "instance_name" {
  description = "Name for the compute instance"
  type        = string
  default     = "codr-k8s-host"
}

variable "network_name" {
  description = "Name for the VPC network"
  type        = string
  default     = "codr-network"
}

# Enable required APIs
resource "google_project_service" "compute" {
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "container" {
  service            = "container.googleapis.com"
  disable_on_destroy = false
}

# Create VPC network
resource "google_compute_network" "codr_network" {
  name                    = var.network_name
  auto_create_subnetworks = false
  depends_on              = [google_project_service.compute]
}

# Create subnet
resource "google_compute_subnetwork" "codr_subnet" {
  name          = "${var.network_name}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.codr_network.id

  # Secondary ranges for Kubernetes pods and services
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/20"
  }
}

# Firewall rule - Allow SSH
resource "google_compute_firewall" "allow_ssh" {
  name    = "${var.network_name}-allow-ssh"
  network = google_compute_network.codr_network.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["ssh-enabled"]
}

# Firewall rule - Allow HTTP/HTTPS
resource "google_compute_firewall" "allow_http_https" {
  name    = "${var.network_name}-allow-http-https"
  network = google_compute_network.codr_network.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web-server"]
}

# Firewall rule - Allow Kubernetes API
resource "google_compute_firewall" "allow_k8s_api" {
  name    = "${var.network_name}-allow-k8s-api"
  network = google_compute_network.codr_network.name

  allow {
    protocol = "tcp"
    ports    = ["6443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["k8s-master"]
}

# Firewall rule - Allow NodePort range
resource "google_compute_firewall" "allow_nodeports" {
  name    = "${var.network_name}-allow-nodeports"
  network = google_compute_network.codr_network.name

  allow {
    protocol = "tcp"
    ports    = ["30000-32767"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["k8s-node"]
}

# Firewall rule - Internal communication
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.network_name}-allow-internal"
  network = google_compute_network.codr_network.name

  allow {
    protocol = "icmp"
  }

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  source_ranges = ["10.0.0.0/8"]
}

# Reserve static external IP
resource "google_compute_address" "codr_ip" {
  name   = "${var.instance_name}-ip"
  region = var.region
}

# Service account for the instance
resource "google_service_account" "codr_sa" {
  account_id   = "codr-k8s-sa"
  display_name = "Codr Kubernetes Service Account"
}

# IAM bindings for the service account
resource "google_project_iam_member" "codr_sa_compute" {
  project = var.project_id
  role    = "roles/compute.admin"
  member  = "serviceAccount:${google_service_account.codr_sa.email}"
}

resource "google_project_iam_member" "codr_sa_storage" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.codr_sa.email}"
}

resource "google_project_iam_member" "codr_sa_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.codr_sa.email}"
}

resource "google_project_iam_member" "codr_sa_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.codr_sa.email}"
}

# Compute instance
resource "google_compute_instance" "codr_k8s" {
  name         = var.instance_name
  machine_type = "e2-standard-4"
  zone         = var.zone

  tags = ["ssh-enabled", "web-server", "k8s-master", "k8s-node"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 32
      type  = "pd-ssd"
    }
  }

  network_interface {
    network    = google_compute_network.codr_network.name
    subnetwork = google_compute_subnetwork.codr_subnet.name

    access_config {
      nat_ip = google_compute_address.codr_ip.address
    }
  }

  service_account {
    email  = google_service_account.codr_sa.email
    scopes = ["cloud-platform"]
  }

  # Enable IP forwarding for Kubernetes networking
  can_ip_forward = true

  metadata = {
    enable-oslogin = "TRUE"
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    set -e

    # Update system
    apt-get update && apt-get upgrade -y

    # Install required packages
    apt-get install -y \
      apt-transport-https \
      ca-certificates \
      curl \
      gnupg \
      lsb-release \
      software-properties-common

    # Disable swap (required for Kubernetes)
    swapoff -a
    sed -i '/ swap / s/^/#/' /etc/fstab

    # Load required kernel modules
    cat <<EOT | tee /etc/modules-load.d/k8s.conf
    overlay
    br_netfilter
    EOT

    modprobe overlay
    modprobe br_netfilter

    # Set sysctl params for Kubernetes
    cat <<EOT | tee /etc/sysctl.d/k8s.conf
    net.bridge.bridge-nf-call-iptables  = 1
    net.bridge.bridge-nf-call-ip6tables = 1
    net.ipv4.ip_forward                 = 1
    EOT

    sysctl --system

    # Install containerd
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y containerd.io

    # Configure containerd
    mkdir -p /etc/containerd
    containerd config default | tee /etc/containerd/config.toml
    sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
    systemctl restart containerd
    systemctl enable containerd

    # Install Kubernetes components
    curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
    echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list
    apt-get update
    apt-get install -y kubelet kubeadm kubectl
    apt-mark hold kubelet kubeadm kubectl

    # Enable kubelet
    systemctl enable kubelet

    # Install Helm
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

    echo "Kubernetes prerequisites installed. Run 'sudo kubeadm init' to initialize the cluster."
  EOF

  depends_on = [
    google_project_service.compute,
    google_project_service.container
  ]

  lifecycle {
    ignore_changes = [metadata_startup_script]
  }
}

# Outputs
output "instance_name" {
  description = "Name of the created instance"
  value       = google_compute_instance.codr_k8s.name
}

output "instance_external_ip" {
  description = "External IP address of the instance"
  value       = google_compute_address.codr_ip.address
}

output "instance_internal_ip" {
  description = "Internal IP address of the instance"
  value       = google_compute_instance.codr_k8s.network_interface[0].network_ip
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "gcloud compute ssh ${google_compute_instance.codr_k8s.name} --zone=${var.zone} --project=${var.project_id}"
}

output "next_steps" {
  description = "Instructions for setting up Kubernetes"
  value       = <<-EOT
    After the instance is ready:
    1. SSH into the instance
    2. Initialize Kubernetes: sudo kubeadm init --pod-network-cidr=10.244.0.0/16
    3. Set up kubectl: mkdir -p $HOME/.kube && sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config && sudo chown $(id -u):$(id -g) $HOME/.kube/config
    4. Install a CNI (e.g., Flannel): kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
    5. Allow scheduling on master (single node): kubectl taint nodes --all node-role.kubernetes.io/control-plane-
  EOT
}
