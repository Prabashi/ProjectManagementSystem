Feature: Project Management

  Scenario: Admin creates a new project
    Given I am logged in as an admin
    When I click "New project"
    And I fill in "Name" with "Alpha Project"
    And I click "create project"
    Then I should see "Alpha Project" in the page
