Feature: Dashboard

  Scenario: Admin creates a dashboard
    Given I am logged in as an admin
    And a project "Dashboard Test Project" exists
    When I go to the dashboard for "Dashboard Test Project"
    And I click "Create Dashboard"
    And I confirm creating the dashboard
    Then I should see the dashboard page
