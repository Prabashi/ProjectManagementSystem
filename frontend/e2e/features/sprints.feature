Feature: Sprint Management

  Scenario: Admin creates a sprint
    Given I am logged in as an admin
    And a project "Sprint Test Project" exists
    When I go to the project page for "Sprint Test Project"
    And I click the "Sprints" tab
    And I click "New sprint"
    And I fill in "Name" with "Sprint 1"
    And I click "create sprint"
    Then I should see "Sprint 1" in the page
