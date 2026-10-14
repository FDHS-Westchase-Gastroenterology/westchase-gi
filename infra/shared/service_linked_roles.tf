# The first load balancer, ECS cluster and RDS instance in an account each
# make their service create its linked role, and the caller needs
# iam:CreateServiceLinkedRole to let it. Creating the three roles here keeps
# that action out of the environments' apply policies: it is scoped by role
# name, not by environment, and every environment would share the role
# whichever apply created it first.
resource "aws_iam_service_linked_role" "environment" {
  for_each = {
    ecs                  = "ecs.amazonaws.com"
    elasticloadbalancing = "elasticloadbalancing.amazonaws.com"
    rds                  = "rds.amazonaws.com"
  }

  aws_service_name = each.value
}
