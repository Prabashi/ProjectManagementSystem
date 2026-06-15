Feature: Authentication

  Scenario: User logs in with valid credentials
    Given a registered admin user "auth_admin" with password "Admin1234!"
    When I go to the login page
    And I fill in "Username" with "auth_admin"
    And I fill in "Password" with "Admin1234!"
    And I click "sign in"
    Then I should see the "Projects" heading
